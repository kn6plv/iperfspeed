var results = '';

$(function() {
    $('#submit-test').on('click', function(e) {
        e.preventDefault();
        if ($('#server').val().length == 0) return;
        if ($('#client').val().length == 0) return;        

        $('#submit-test').prop("disabled", true);
        $('#server').prop("disabled", true);
        $('#client').prop("disabled", true);
        $('#submit-test').html('<div class="loading"></div>');
        
        results = '';
        $('#test-result').html(results);
        run_test($('#client').val(), $('#server').val());
    });

    load_tests();
    load_nodes();
});

function load_nodes() {
    $.ajax({
        url: '/cgi-bin/iperfspeed?action=nodes',
        type: "GET",
        dataType: "json",
        context: this,
        cache: false,
        success: function(data, textStatus, jqXHR)
        {            
            if (data == null) return;
            console.log(data);
            $.each(data, function (i, item) {
                $('#server').append($('<option>', { 
                    value: item.node,
                    text : item.node 
                }));
                $('#client').append($('<option>', { 
                    value: item.node,
                    text : item.node 
                }));
            });
        },
        complete: function(jqXHR, textStatus) {
            //console.log( "messages complete" );
            //messages_updating = false;
        }
    });
}

function show_results(txt) {
    results += txt + "\n";
    $('#test-result').html('<pre>' + results + '</pre>');
}

function run_client(client, server) {
    show_results("Starting iperf client");
    $.ajax({
        url: 'http://' + client + ':8080/cgi-bin/iperfspeed?action=run_client&server=' + server + "&client=" + client,
        type: "GET",
        cache: false,
        timeout: 60000,    
        dataType: "text",
        context: this,
        cache: false,
        success: function(data, textStatus, jqXHR) {
            console.log(data);

            if (data.match(/failed/)) {
                show_results(data);
                return;
            }

            var lines = data.split("\n");
            console.log(lines);

            var result = '';

            for (var i = 0; i < lines.length - 2; i++) result += lines[i] + "\n";

            show_results(result);

            if (data.match(/error/)) return;

            var match = data.match(/([-+]?[0-9]*\.?[0-9]*\s\w+)\/sec.*sender\n/);

            console.log(match);

            if (match && match.length == 2) post_results(client, server, match[1]);
        },
        complete: function(jqXHR, textStatus) {
            stop_server(server);

            $('#submit-test').prop("disabled", false);
            $('#server').prop("disabled", false);
            $('#client').prop("disabled", false);
            $('#submit-test').html('Run Test');
        }
    });
}

function run_test(client, server) {
    // Start iperf
    show_results("Starting iperf server");
    $.ajax({
        url: 'http://' + server + ':8080/cgi-bin/iperfspeed?action=start_server',
        type: "GET",
        dataType: "text",
        context: this,
        cache: false,
        success: function(data, textStatus, jqXHR) {            
            console.log(data);
            show_results("iperf server started");
            run_client(client, server)
        },
        complete: function(jqXHR, textStatus) {
        }
    });
}

function stop_server(host) {
    $.ajax({
        url: 'http://' + host + ':8080/cgi-bin/iperfspeed?action=stop_server',
        type: "GET",
        dataType: "text",
        context: this,
        cache: false,
        success: function(data, textStatus, jqXHR) {            
            console.log(data);            
        },
        complete: function(jqXHR, textStatus) {
        }
    });
}

function post_results(client, server, result) {
    var post_data = new Object();

    post_data.client = client;
    post_data.server = server;
    post_data.result = result;
    post_data.action = 'test_results';

    $.ajax({
        url: '/cgi-bin/iperfspeed',
        type: "POST",
        data: $.param(post_data),
        dataType: "text",
        context: this,
        cache: false,
        success: function(data, textStatus, jqXHR) {            
            console.log(data);
            load_tests();
        },
        complete: function(jqXHR, textStatus) {            
        }
    });
}

function load_tests() {
    $.ajax({
        url: '/cgi-bin/iperfspeed?action=previous_tests',
        type: "GET",
        dataType: "json",
        context: this,
        cache: false,
        success: function(data, textStatus, jqXHR)
        {            
            if (data == null) return;
            console.log(data);
            process_tests(data);
        },
        complete: function(jqXHR, textStatus) {
            //console.log( "messages complete" );
            //messages_updating = false;
        }
    });
}

function process_tests(data) {
    var html = '';    

    for (var i = 0; i < data.length; i++) {
        var row = '';        
        var date = new Date(0);
        date.setUTCSeconds(data[i].epoch);        

        var formated_date = format_date(date);        

        row += '<tr>';
        row += '<td>' + formated_date + '</td>';
        row += '<td>' + data[i].server + '</td>';
        row += '<td>' + data[i].client + '</td>';
        row += '<td>' + data[i].result + '</td>';
        row += '<td><button class="button-primary retest-button">Re-Test</button></td>';
        row += '</tr>';

        html += row;
    }

    $('#tests-table').html(html);

    $('.retest-button').on('click', function(e) {
        e.preventDefault();
        
        //var row = $(this).closest('tr').get(0);
        var row = $(this).closest('tr');
        //var cell = $(row).children().get(1);
        var server = $(row).children().eq(1).text();
        var client = $(row).children().eq(2).text();
        console.log(server);
        console.log(client);

        $('#server').val(server);
        $('#client').val(client);
        $('#submit-test').trigger('click');
    });
}

function epoch() {
    return Math.floor(new Date() / 1000);
}

function format_date(date) {
    var string;
    
    var year = String(date.getFullYear());

    string = (date.getMonth()+1) + '/' + date.getDate() + '/' + year.slice(-2);
    string += ' ';

    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0'+minutes : minutes;

    string += hours + ':' + minutes + ' ' + ampm;

    return string;
}
