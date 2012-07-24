jQuery.fn.djcelery = function(options) {
    var interval_id;
    var el = this;
    var url = '/task/' + options.task_id + '/status/';
    var number_of_errors = 0;
    if (options.task_id.length !== 36) {
        url = '';
    }

    if (typeof(options.on_failure) !== 'function') {
        options.on_failure = function(){};
    }
    if (typeof(options.on_error) !== 'function') {
        options.on_error = function(){};
    }
    if (typeof(options.on_other) !== 'function') {
        options.on_other = function(){};
    }

    function handle_status(data) {
        if (data === null){
            return;
        }
        var task = data.task;
        if (task === null) {
            return;
        }

        if (task.status == 'PENDING') {
            return;
        }

        if (task.status == 'SUCCESS') {
            clearInterval(interval_id);
            options.on_success(task, el);
        }
        else if (task.status == 'FAILURE' ) {
            clearInterval(interval_id);
            options.on_failure(task, el);
        } else {
            options.on_other(task, el);
        }
    }

    function handle_error() {
        ++number_of_errors;
        // Wait after first error, just in case there is a timing issue
        if (number_of_errors >= 2) {
            clearInterval(interval_id);
            options.on_error(null, el);
        }
    }

    function check_status() {
        $.ajax({
            url: url,
            data: {},
            success: handle_status,
            cache: false, // append a timestamp to the end of the URL
            dataType: 'json',
            error: handle_error
        });
    }

    $(document).ready(function(){
        if (url !== '') {
            setTimeout(check_status, 0);
            interval_id = setInterval(check_status, options.check_interval);
        } else {
            number_of_errors = 3;
            handle_error();
        }
    });
};
