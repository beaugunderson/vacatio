var baseUrl = 'http://vacat.io/carealot';

function get(url, options, callback) {
   if (options === undefined ||
      options === null) {
      options = {};
   }

   options.access_token = accessToken;

   $.getJSON(baseUrl + url, options, callback);
}

var singly = {
   get: get
};

var spinnerOptions = {
  lines: 10,
  length: 4,
  width: 1.5,
  radius: 3,
  rotate: 0,
  color: '#000',
  speed: 1,
  trail: 60,
  shadow: false,
  hwaccel: true,
  className: 'spinner',
  zIndex: 2e9,
  top: 'auto',
  left: 'auto'
};

var sources = [
   {
      service: 'facebook',
      type: 'feed'
   },
   {
      service: 'foursquare',
      type: 'checkins'
   },
   {
      service: 'instagram',
      type: 'media'
   },
   {
      service: 'twitter',
      type: 'tweets'
   }
];

var actions = [];
var spinners = {};

function commas(number) {
   return String(number).replace(/(^|[^\w.])(\d{4,})/g, function($0, $1, $2) {
      return $1 + $2.replace(/\d(?=(?:\d\d\d)+(?!\d))/g, "$&,");
   });
}

function ingest(data) {
   _.each(data, function(item) {
      actions.push({
         at: item.at,
         idr: item.idr
      });
   });
}

function getDataFn(source) {
   return function(callback) {
      spinners[source.service] = new Spinner(spinnerOptions).spin($('#' + source.service).get(0));

      singly.get('/services/' + source.service, null, function(metadata) {
         var options = {};

         if (metadata[source.type] > 0) {
            options.limit = metadata[source.type];
         }

         singly.get('/services/' + source.service + '/' + source.type, options, function(data) {
            ingest(data);

            spinners[source.service].stop();

            callback(null, data);
         });
      });
   };
}

function updateMyDays() {
   var myDays = parseInt($('#vacation-days option:selected').val(), 10);

   $('#dates li').each(function(li) {
      var liDays = parseInt($(this).attr('data-days'), 10);

      if (liDays < myDays) {
         $(this).hide();
      } else {
         $(this).show();
      }
   });
}

$(function() {
   $('#ajax-error').ajaxError(function(e, jqxhr, settings, exception) {
      $(this).show();

      $('#ajax-error-details').html(sprintf(
         '<strong>URL:</strong> %s<br />' +
         '<strong>Exception:</strong> %s<br />',
         settings.url,
         exception));
   });

   $('#vacation-days').change(function() {
      updateMyDays();
   });

   if (accessToken === 'undefined' ||
      accessToken === undefined) {
      return;
   }

   singly.get('/profiles', null, function(profiles) {
      var functions = {};

      _.each(sources, function(source) {
         if (profiles[source.service] !== undefined) {
            functions[source.service] = getDataFn(source);
         }
      });

      async.parallel(functions, function(err, results) {
         var i;

         actions = _.sortBy(actions, function(item) {
            return item.at;
         });

         var first = moment(actions[0].at);
         var daysAgo = moment().diff(first, 'days');

         var days = {};
         var today = moment();

         for (i = 0; i <= daysAgo; i++) {
            var date = today.clone().subtract('days', i);
            var dateString = date.format('YYYY-DDD');

            days[dateString] = {
               date: date,
               value: 0
            };
         }

         _.each(actions, function(action) {
            var date = moment(action.at).format('YYYY-DDD');

            days[date].value++;
         });

         var streak = 0;
         var longestStreak = 0;

         _.each(days, function(day) {
            if (day.value === 0) {
               streak += 1;
            } else {
               if (streak > 0) {
                  if (streak > longestStreak) {
                     longestStreak = streak;
                  }

                  var streakDate = day.date.clone().subtract('days', streak - 1);

                  $('#dates').append(sprintf('<li data-days="%d">%d days <span class="range">%s to %s</span></li>',
                     day.date.diff(streakDate, 'days') + 1,
                     day.date.diff(streakDate, 'days') + 1,
                     streakDate.format('M/D/YYYY'),
                     day.date.format('M/D/YYYY')));
               }

               streak = 0;
            }
         });

         $('#results-stats-text').text(sprintf("Your oldest activity happened on %s. Since then you've done %s more things on the Internet, at an average of %.2f per day.",
            first.format('MMMM Do YYYY'),
            commas(actions.length - 1),
            actions.length / daysAgo));

         $('#share-stats').attr('data-text', sprintf("Since %s I've done %s things on the Internet (~%.1f a day). My longest break was %d days.",
            first.format('M/YYYY'),
            commas(actions.length - 1),
            actions.length / daysAgo,
            longestStreak));

         $.getScript("//platform.twitter.com/widgets.js");

         updateMyDays();

         $('#results').append(sprintf('<p>Your longest streak of inactivity was %d days.</p>', longestStreak));

         $('.results').show();
      });
   });
});
