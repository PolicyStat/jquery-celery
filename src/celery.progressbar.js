$(document).ready(function () {
    var $progress_container = $('.progress_container');
    var $time_remaining = $progress_container.find('.time_remaining');
    var $progress_bar = $progress_container.find('.progress .bar');
    $('.loading').djcelery({
        task_id: task_id,
        check_interval: 5000,
        on_success: function (task) {
            $('.loading').hide();
            var total_time =  task.result.total_time;
            var url = task.result.url
            $time_remaining.html('Took ' + total_time + ' seconds to complete.');
            $progress_container.find('.progress').addClass('hidden');
            var msg;
            if (task.result === null) {
                msg = '<p>No files were modified during the given date range</p>';
            } else {
                msg = '<p>Your download is ready</p><p><a href="' + url + '">Download Here</a></p>';
            }
            $time_remaining.after(msg);
        },
        on_failure: function (task) {
            $('.loading').hide();
            var msg = '<p class="error">There was an error generating your download.</p>';
            $('.results > h4').after(msg);
        },
        on_error: function () {
            $('.loading').hide();
            var msg = '<p class="error">There was an error generating your download.</p>';
            $('.results > h4').after(msg);
        },
        on_other: function(task_result) {
            if (task_result.status == 'PROGRESS') {

                // Set the percentage
                var percent = task_result.result.progress_percent;
                $progress_bar.css('width', percent + '%');

                // Set time remaining
                time_remaining = task_result.result.time_remaining;
                if (time_remaining > 0) {
                    $time_remaining.html('Approximate time left: ' + Math.round(time_remaining) + ' seconds');
                }
            }
        }
    });
});

