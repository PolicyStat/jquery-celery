(function() {

function round_1(to_round) {
    return Math.round(to_round * 10) / 10;
}

/**
    build_results_table
    ===================

    Create a jquery ui datatable at the table specified by the given ``tableSelector``.

    `rowData` is an array of objects representing the rows.
    `columns` is an array of 2-item arrays containing a column name and then
    the appropriate index in to the `data` object to retrieve that data, plus an
    optional 3rd item which is a formatting callback.
    `caption` is the string to use as the table caption
    `totals` an array containing a "totals" row for the end of the table. Leave
    empty if no totals row should be included.
    `tableSelector` is a jQuery selector string matching the table which should
    be used.
    `options` is an optional object containing additional `dataTable`
    configurations that should override the defaults.
*/
function build_results_table(rowData, columns, caption, totals, tableSelector, options) {
    var tableRows = [],
        tr,
        column,
        columnIndex,
        formatter,
        columnLabels = [],
        dataTableDefaults;
    $.each(rowData, function (index, row) {
        tr = [];
        // Loop through all of the columns in order, pulling out and
        // appropriately formatting the data for table row usage.
        for (i = 0; i < columns.length; i++) {
            column = columns[i];
            columnIndex = column[1];
            if (columnIndex === "") {
                // An empty string indicates an empty cell
                tr.push('&nbsp;');
                continue;
            }
            if (column.length === 3) {
                // We have a formatter function
                formatter = column[2];
                tr.push(formatter(row[columnIndex]));
            } else {
                // No formatter
                tr.push(row[columnIndex]);
            }
        }
        tableRows.push(tr);
    });

    // If we're using a totals row, fill in the data
    if (totals.length > 0) {
        tr = ['TOTAL'];
        for (i = 0; i < columns.length; i++) {
            column = columns[i];
            if (column.length === 3) {
                // We have a formatter function
                columnIndex = column[1];
                formatter = column[2];
                tr.push(formatter(row[columnIndex]));
            } else {
                // No formatter
                columnIndex = column[1];
                tr.push(row[columnIndex]);
            }
        }
        tableRows.push(tr);
    }

    for (i = 0; i < columns.length; i++) {
        columnLabels.push({'sTitle': columns[i][0]});
    }

    $(tableSelector).prepend('<caption>' + caption + '</caption');

    dataTableDefaults = {
        'bJQueryUI': true,
        'aaData': tableRows,
        'aoColumns': columnLabels
    };
    $(tableSelector).dataTable(
        $.extend(dataTableDefaults, options)
    );
    $(tableSelector).show();
}

$(document).ready(function () {
/**
 *    Currently, this just relies on the existence of a single, global
 *    `djceleryConfigs` object, which is dumb. Unfortunately, ticket #486 is
 *    already like 3k lines, so we'll put this off until the next time we need
 *    to use a DataTable of results.
 *
 *    TODO: This should be turned in to a jquery plugin with options. You
 *    should be able to call `$('.foo').datatableFromCelery({...})` to
 *    instantiate.
 *    TODO: Investigate marrying this plugin to a format that django-datatables
 *    provides:
 *    https://github.com/christhekeele/django-datatables/issues/2#issuecomment-5489702
 *
 *    For an example of options, check
 *    `pstat/templates/administration/user_csv_upload.html`.
 *
 *    Roughly:
 *
 *    `taskId` String representing the Celery AsyncResult matching the task
 *    whose results we will need to display.
 *    `checkInterval` Int The number of ms to wait between task status checks.
 *    `failureCallback` Function An optional callback run when a task fails.
 *    `table` Object An object describing the table configuration. It can optionally
 *    have `success` and `error` objects that define behavior under those task
 *    result conditions.
 *
 *    Each of `error` and `success` `table` objects should have the following
 *    parameters:
 *
 *    `columns` Array An array of 2-item arrays containing a column name
 *    and then the appropriate index in to the `data` object to retrieve that
 *    data, plus an optional 3rd item which is a formatting callback.
 *    `captionCallback` Function A callback that accepets the parsed JSON task
 *    results and returns a string that will be used as the DataTable's
 *    caption.
 *    `resultsTable` String A jQuery selector string matching the table which
 *    should be used. This allows separate table ids to be used based on the
 *    task result (eg. one table for validation errors and another for success)
 *    `options` Object An optional object containing additional `dataTable`
 *    configurations that should override the defaults.
 */
    $(djceleryConfigs.tableSelector).djcelery({
        task_id: djceleryConfigs.taskId,
        check_interval: 5000,
        on_success: function (task) {
            $('.loading').hide();
            var parsedResult = task.result,
                msg,
                confs;
            if (parsedResult.resultStatus === 'error') {
                confs = djceleryConfigs.table.error;
            } else if (parsedResult.resultStatus === 'success') {
                confs = djceleryConfigs.table.success;
            } else {
                msg = '<p class="error">Oops. No data available. ';
                msg += 'There was an error completing your task</p>';
                $(djceleryConfigs.selector).after(msg);
                return;
            }
            build_results_table(
                parsedResult.rowData,
                confs.columns,
                confs.captionCallback(parsedResult),
                [],
                confs.resultsTable,
                confs.options);
            if (typeof confs.callback !== 'undefined') {
                confs.callback();
            }
        },
        on_failure: function (task) {
            $('.loading').hide();
            var msg = '<p class="error">There was an error completing your task.</p>';
            $(djceleryConfigs.selector).after(msg);
            if (typeof djceleryConfigs.failureCallback !== 'undefined') {
                djceleryConfigs.failureCallback();
            }
        },
        on_error: function (task) {
            $('.loading').hide();
            var msg = '<p class="error">There was an error completing your task.</p>';
            $(djceleryConfigs.selector).after(msg);
            if (typeof djceleryConfigs.failureCallback !== 'undefined') {
                djceleryConfigs.failureCallback();
            }
        },
        on_other: function (task) {
            // TODO: Scope all of the `.progress_FOO` selectors with our div
            // selector
            if (task.status === 'PROGRESS') {
                var progress = task.result,
                    progressPercent,
                    timeRemaining;
                progressPercent = Math.round(progress.progress_percent);
                timeRemaining = Math.round(progress.time_remaining);
                if (timeRemaining < 0 || progressPercent < 2) {
                    // If we're just starting, the estimate is wrong, so
                    // display a different message.
                    $('.progress_percentage').html('Your job is getting started.');
                    $('.progress_estimate').html(
                        "Working on an estimate for how long this will take."
                    );
                } else if (timeRemaining < 5 || progressPercent > 98) {
                    // If we're very near the end, the estimates tend to get
                    // wild. Just display a message saying it's almost done.
                    $('.progress_percentage').html('Almost finished.');
                    $('.progress_estimate').html("Just a few more seconds.");
                } else{
                    $('.progress_percentage').html(progressPercent + '% complete');
                    $('.progress_estimate').html(
                        'Approximately ' + timeRemaining + ' seconds remaining'
                    );
                }
            }
        }
    });
});

})(); // Closure
