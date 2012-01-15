Author
---
  Oli McCormack

Description
---
  Simple Pivot Table functionality for a Google Visualization DataTable.

Usage
---
    var simple_pivot = new gvizpivot.PivotAgg(
      gviz_table, // standard gviz data table
      {pivotColumnIndex: {
         column: 0,
         aggregator: google.visualization.data.sum // how to aggregate the pivoted values,
       },
       pivotKeyIndexes: [{column: 1}],
       pivotValueIndex: {column: 4}
      });

    var simple_tbl = simple_pivot.getDataTable();

Options
---
     * @param {google.visualization.DataTable} dataTable Original datatable.
     * @param {Object} opts Set of options to apply to our datatable. Options:
     *    pivotColumnIndex {Object} [mandatory]
     *        column {number} [mandatory] Index of selected column
     *        sortDesc {boolean} [optional|default: false] Sort order of columns
     *        aggregator {Function} [mandatory] Aggregation function for pivoted
     *            values. Should accept an array of values, and return a single
     *            numeric response.
     *        columnTitleModifier {Function} [optional] Should accept the pivoted
     *            column header and return a replacement value.
     *        formatters {Array.<formatter>} [optional] Array of formatters to
     *            apply to the column.
     *    pivotKeyIndexes {Array.<Object>} [mandatory]
     *        column {number} Columns that should be used as keys.
     *        modifier {function} [optional] Function to adjust the key
     *        type {String} [optional] Type of output. Should match output type of
     *                      modifier function.
     *    pivotValueIndex {Object} [mandatory]
     *        column {number} [mandatory] Column to use as a value.
     *    summaryColumns {Array.<Object>} [optional]
     *      label {String} [mandatory] Title to label aggregation column with
     *      aggregator {Function} [mandatory] Should accept an array of values
     *          representing pivoted row values, and return a single numeric
     *          value.
     *      formatters {Array.<formatter>} [optional] Array of formatters to
     *            apply to the column.
     *    usePercentTotalValues {boolean} [optional|default: false] If true,
     *        converts column values to be a percent of column total.