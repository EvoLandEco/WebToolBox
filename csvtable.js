(function(global, $) {
    'use strict';

    function generateTableFromCSV(csvPath) {
        $.ajax({
            url: csvPath,
            dataType: 'text',
        }).done(function(data) {
            // Parse the CSV file
            const parsedData = Papa.parse(data, {
                header: true, // Assumes the first row contains the headers
                dynamicTyping: true,
            });

            // Create HTML table
            let tableHtml = '<thead><tr>';
            for (const header of parsedData.meta.fields) {
                tableHtml += `<th>${header}</th>`;
            }
            tableHtml += '</tr></thead><tbody>';

            for (const row of parsedData.data) {
                tableHtml += '<tr>';
                for (const header of parsedData.meta.fields) {
                    tableHtml += `<td>${row[header]}</td>`;
                }
                tableHtml += '</tr>';
            }
            tableHtml += '</tbody>';

            $('#csvTable').html(tableHtml);

            new DataTable($('#csvTable'));
        });
    }

    // Expose the function to the global scope
    global.generateTableFromCSV = generateTableFromCSV;

}(window, jQuery));
