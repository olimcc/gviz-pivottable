/*
  Copyright 2011 Oli McCormack

  Licensed under the Apache License, Version 2.0 (the &quot;License&quot;);
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an &quot;AS IS&quot; BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

/**
 * @fileoverview Gviz Pivot Table functionality.
 * @author dev@olimcc.com (Oli Mcc)
 *
 * Sample usage:
 * *******************************************
 *  var pivot = new gvizpivot.PivotAgg(
 *    gviz_table, // a normal gviz datatable
 *    {pivotKeyIndexes: [{column: 2}],
 *     pivotColumnIndex: {column: 0,
 *                        aggregator: google.visualization.data.sum},
 *     pivotValueIndex: {column:3},
 *     summaryColumns: [{label: 'Total',
 *                       aggregator: google.visualization.data.sum}]});
 *  var tbl = pivot.getDataTable();
 * *******************************************
 */

/**
 * Namespace for pivoting code.
 */
var gvizpivot = {};

/**
 * Class to provide pivot-table like functionality with google visualization
 * data tables.
 *
 * @constructor
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
 */

gvizpivot.PivotAgg = function(dataTable, opts) {

  this.dataTable_ = dataTable;
  this.options_ = opts;
  this.keyColumnIndexMap_ = {};
  this.columnColumn_IndexMap_ = {};
  this.rowAggregationMap_ = {};
  this.model = {};
  this.parseOptions_();

  this.outputTable_ = new google.visualization.DataTable();
  this.performPivotConversion_();
};

/**
 * Interpret options set by user.
 *
 * @private
 */
gvizpivot.PivotAgg.prototype.parseOptions_ = function() {
  this.keyColumns_ = this.options_.pivotKeyIndexes || false;
  this.columnColumn_ = this.options_.pivotColumnIndex || false;
  this.valueColumn_ = this.options_.pivotValueIndex || false;
  this.summaryColumns_ = this.options_.summaryColumns || false;
  this.usePercentTotalValues_ = this.options_.usePercentTotalValues || false;
};

/**
 * Return the pivoted datatable.
 *
 * @return {google.visualization.DataTable} Our pivoted datatable.
 */
gvizpivot.PivotAgg.prototype.getDataTable = function() {
  return this.outputTable_;
};

/**
 * Perform conversion.
 *
 * @private
 */
gvizpivot.PivotAgg.prototype.performPivotConversion_ = function() {
  if (!this.keyColumns_ || !this.columnColumn_ || !this.valueColumn_) {
    throw ('Insufficient options provided: ' +
           'pivotKeyIndexes, pivotColumnIndex, pivotValueIndex ' +
           'must be provided');
  }

  // core operations
  this.addKeyColumns_();
  this.addColumnColumns_();
  this.buildModel_();
  this.writeTableFromModel_();
  // based on user settings
  if (this.summaryColumns_) {
      if (this.summaryColumns_[0].applyOrder == 'before') {
        this.addAggregationColumn_();
      }
  }
  if (this.usePercentTotalValues_) {
    this.convertColumnsToPercentOfTotal_();
  }
  if (this.columnColumn_.formatters) {
    this.applyFormattingToColumns_(this.columnColumn_.formatters,
                                   this.getColumnIndexesArray());
  }
  if (this.summaryColumns_) {
      if (this.summaryColumns_[0].applyOrder != 'before') {
        this.addAggregationColumn_();
      }
  }
};


/**
 * Adds left most columns, reflecting the keys of our pivot table.
 *
 * @private
 */
gvizpivot.PivotAgg.prototype.addKeyColumns_ = function() {
  for (var i = 0; i < this.keyColumns_.length; i++) {
    var kc = this.keyColumns_[i],
        col = kc.column,
        type = kc.type || this.dataTable_.getColumnType(col),
        label = this.dataTable_.getColumnLabel(col);
    this.keyColumnIndexMap_[col] = this.outputTable_.addColumn(
       type, label);

  }
};

/**
 * Adds pivoted columns, after key columns. Pivoted columns
 * are generated using the set of unique values from our chosen
 * pivotColumnIndex.
 *
 * @private
 */
gvizpivot.PivotAgg.prototype.addColumnColumns_ = function() {
  var distinct = this.dataTable_.getDistinctValues(
      this.columnColumn_['column']);
  if (this.columnColumn_['sortDesc']) {
    distinct.sort();
  } else {
    distinct.sort().reverse();
  }
  var type = this.dataTable_.getColumnType(this.valueColumn_['column']);
  for (var i = 0; i < distinct.length; i++) {
    var newColTitle = distinct[i];
    // if we have a modifier, overwrite
    if (this.columnColumn_['columnTitleModifier'] != undefined) {
      newColTitle = this.columnColumn_['columnTitleModifier'](distinct[i]);
    }
    // holds for example, 'Marketing' => 5
    if (!this.columnColumn_IndexMap_[String(newColTitle)]) {
      this.columnColumn_IndexMap_[String(newColTitle)] =
          this.outputTable_.addColumn(type, newColTitle);
    }
  }
};

/**
 * Gets an array reflecting an empty row of data.
 * Excludes key columns. Assumes that every value is a number.
 *
 * @private
 * @return {Array.<number>} A default row.
 */
gvizpivot.PivotAgg.prototype.getDefaultRowExcludingKeyColumns_ = function() {
  if (this.defaultRow != undefined) {
    return this.defaultRow;
  }
  this.defaultRow = [];
  for (var i in this.columnColumn_IndexMap_) {
    this.defaultRow.push(0);
  }
  return this.defaultRow;
};

/**
 * Loops through our base data table and constructs a representation of our data.
 * The output is stored in this.model.
 *
 * The model stores an array of eligible values for any pivoted
 * row/column combination. This can then be used to populate our pivoted
 * data table based on a variety of aggregations (sum, avg, max etc).
 *
 * For example:
 * Base DataTable looks like:
 *  Name  | Day | Spend
 *  Oli   | Mon | 10
 *  Oli   | Mon | 15
 *  Oli   | Mon | 13
 *  Kate  | Mon | 8
 *  Kate  | Tue | 15
 *  Kate  | Tue | 11
 *  Joe   | Tue | 25
 *  Oli   | Tue | 30
 *
 * Generated model looks like:
 * {1: {1: [10, 15, 13],
 *      2: [30]},
 *  2: {1: [8],
 *      2: [15, 11]},
 *  3: {1: [],
 *      2: [30]}}
 *
 * @private
 */
gvizpivot.PivotAgg.prototype.buildModel_ = function() {

  var keysMap = {};
  var defaultRow = this.getDefaultRowExcludingKeyColumns_();

  // loop through our base data table, figuring out what goes where
  for (var i = 0; i < this.dataTable_.getNumberOfRows(); i++) {

    // generate a row key - based on keyColumns selected by user
    var keyArray = [];
    for (var j = 0; j < this.keyColumns_.length; j++) {

      var kc = this.keyColumns_[j];
      var val = this.dataTable_.getValue(i, this.keyColumns_[j].column);
      // checks if the key should be modifier in anyway before applying.
      var modVal = (kc.modifier) ? kc.modifier(val) : val;
      var type = kc.type || null;
      modVal = (type == 'string') ? String(modVal) : modVal;
      keyArray.push(modVal);
    }

    // add keys (and a corresponding default row) to table if they
    // don't already exist
    if (keysMap[keyArray] == undefined) {
      var newRow = keyArray.concat(defaultRow.slice(0));
      var newRowIndex = this.outputTable_.addRow(newRow);
      // a map of keys (list of str) => row indexes (int)
      keysMap[keyArray] = newRowIndex;
      this.model[newRowIndex] = {};
      this.rowAggregationMap_[newRowIndex] = [];
    }

    // get the relevant information about the active cell
    var columnEntry = this.dataTable_.getValue(
        i,
        this.columnColumn_['column']);
    if (this.columnColumn_['columnTitleModifier']) {
      columnEntry = this.columnColumn_['columnTitleModifier'](columnEntry);
    }
    var value = this.dataTable_.getValue(i, this.valueColumn_['column']);
    var columnIndex = this.columnColumn_IndexMap_[String(columnEntry)];
    var rowIndex = keysMap[keyArray];

    // add the value to the corresponding part of our model
    if (this.model[rowIndex][columnIndex] == undefined) {
      this.model[rowIndex][columnIndex] = [];
    }
    this.model[rowIndex][columnIndex].push(value);
  }
};

/**
 * Actually writes values to our output table based on values
 * in our model and our chosen aggregation method.
 *
 * @private
 */
gvizpivot.PivotAgg.prototype.writeTableFromModel_ = function() {
  var aggregator = this.columnColumn_['aggregator'];
  for (var rowIndex in this.model) {
    for (var columnIndex in this.model[rowIndex]) {
      var resultValue = aggregator(
          this.model[rowIndex][columnIndex]);
      this.outputTable_.setValue(
        Number(rowIndex),
        Number(columnIndex),
        resultValue);
     }
     this.rowAggregationMap_[rowIndex].push(resultValue);
    if (this.outputTable_.getValue(Number(rowIndex), 1) == 'Risk review queries') {
      this.outputTable_.getValue(Number(rowIndex), 2);
    }
   }
};

/**
 * Get an array of column indexes added as generated column.
 *
 * @return {Array.<number>} An array of columnColumn generated indexes.
 */
gvizpivot.PivotAgg.prototype.getColumnIndexesArray = function() {
  // generate a list of columns
  if (this.columnIndexesArray != undefined) {
    return this.columnIndexesArray;
  }
  this.columnIndexesArray = [];
  for (var i in this.columnColumn_IndexMap_) {
    this.columnIndexesArray.push(this.columnColumn_IndexMap_[i]);
  }
  return this.columnIndexesArray;
};


/**
 * Add aggregation columns to our table.
 *
 * @private
 */
gvizpivot.PivotAgg.prototype.addAggregationColumn_ = function() {
  // add an aggregation column, at the end
  var cols = this.getColumnIndexesArray();
  for (var k = 0; k < this.summaryColumns_.length; k++) {
    var aggregationColumn = this.outputTable_.addColumn(
      'number',
      this.summaryColumns_[k].label);
    // i is the row index
    for (var i in this.rowAggregationMap_) {
      var rowVals = gvizpivot.utils.getRowValues(
        this.outputTable_, Number(i),
        cols);
      var aggVal = this.summaryColumns_[k].aggregator(rowVals);
      this.outputTable_.setValue(Number(i),
                        aggregationColumn,
                        aggVal);
    }
    // add formatting to summary column
    if (this.summaryColumns_[k].formatters) {
      this.applyFormattingToColumns_(this.summaryColumns_[k].formatters,
                                     [aggregationColumn]);
    }
  }
};

/**
 * Applys formatting to a specific set of of columns.
 *
 * @private
 * @param {Array} formatters An array of google.visualization formatters.
 * @param {Array.<number>} colIndexes An array of columns indexes to
 *    apply formatting to.
 */
gvizpivot.PivotAgg.prototype.applyFormattingToColumns_ = function(
      formatters, colIndexes) {
  var formatters = formatters || false;
  var cols = colIndexes || false;
  if (formatters != false && cols != false) {
    for (var j = 0; j < formatters.length; j++) {
      for (var i = 0; i < cols.length; i++) {
        formatters[j].format(this.outputTable_, cols[i]);
      }
    }
  }
};

/**
 * Converts all columnColumns to be percent of total values.
 *
 * @private
 */
gvizpivot.PivotAgg.prototype.convertColumnsToPercentOfTotal_ = function() {
  var cols = this.getColumnIndexesArray();
  if (this.options_.usePercentTotalValues == 'col') {
    for (var i = 0; i < cols.length; i++) {
      var newVals = gvizpivot.utils.getColumnPercentTotalArray(
          this.outputTable_,
          cols[i]);
      for (var j = 0; j < newVals.length; j++) {
        this.outputTable_.setValue(
            j, cols[i],
            Math.round(newVals[j] * 10000) / 100);
      }
    }
  } else if (this.options_.usePercentTotalValues == 'row') {
      var rows = this.outputTable_.getNumberOfRows();
      for (var i = 0; i < rows; i++) {
        var newVals = gvizpivot.utils.getRowPercentTotalArray(
            this.outputTable_,
            i,
            cols);
        for (var j = 0; j < cols.length; j++) {
          this.outputTable_.setValue(
              i, cols[j],
              Math.round(newVals[j] * 10000) / 100);
        }
      }
  }
};

/**
 * Get an array of column totals.
 *
 * @return {Array.<number>} An array of column totals.
 */
gvizpivot.PivotAgg.prototype.getGeneratedColumnsTotals = function() {
  var cols = this.getColumnIndexesArray();
  var r = [];
  for (var i = 0; i < cols.length; i++) {
    var newVals = gvizpivot.utils.getColumnEntries(this.outputTable_, cols[i]);
    r.push(google.visualization.data.sum(newVals));
  }
  return r;
};

/**
 * Get an array of column statuses.
 */
gvizpivot.PivotAgg.prototype.getColumnStatus = function() {
  var cols = this.getColumnIndexesArray();
  var r = {};
  for (var i = 0; i < cols.length; i++) {
    r[cols[i]] = {
      entries: gvizpivot.utils.getColumnEntries(this.outputTable_, cols[i]),
      label: this.outputTable_.getColumnLabel(cols[i]),
    };
  }
  return r;
};

/**
 * Get our underlying pivot table model.
 */
gvizpivot.PivotAgg.prototype.getModel = function() {
  return this.model;
};


/**
 * Namespace for utils.
 */
gvizpivot.utils = {};

/**
 * Gets all entries from a data table column.
 *
 * @param {google.visualization.DataTable} dataTable Gviz datatable object.
 * @param {number} colIndex Column index we want values for.
 * @param {number} limit Max number of rows to loop through
 * @return {Array.<number>} Array of values from that column.
 */
gvizpivot.utils.getColumnEntries = function(dataTable, colIndex, limit) {
  var r = [];
  var limit = limit || dataTable.getNumberOfRows();
  limit = (limit > dataTable.getNumberOfRows()) ? dataTable.getNumberOfRows() : limit;
  for (var m = 0; m < limit; m++) {
      r.push(dataTable.getValue(m, colIndex));
  }
  return r;
};

/**
 * Gets all entries from a data table row, for a given a set of columns.
 *
 * @param {google.visualization.DataTable} dataTable Gviz datatable object.
 * @param {number} rowIndex Row index we want values for.
 * @param {Array.<number>} colIndexes Column Indexes we want values for.
 * @return {Array.<number>} Array of values from that row, for columns.
 */
gvizpivot.utils.getRowValues = function(dataTable, rowIndex, colIndexes) {
  var r = [];
  for (var c = 0; c < colIndexes.length; c++) {
    r.push(dataTable.getValue(rowIndex, colIndexes[c]));
  }
  return r;
};

/**
 * Gets values of an column represented as a percent of total of sum of
 * that column.
 *
 * @param {Array.<number>} Array of numbers.
 * @return {Array.<number>} Array of values representing % of total.
 */
gvizpivot.utils.getPercentTotalArray = function(arr) {
  var sumOfCol = google.visualization.data.sum(arr);
  var res = [];
  for (var k = 0; k < arr.length; k++) {
    res.push(arr[k] / sumOfCol);
  }
  return res;
};

/**
 * Gets values of a column represented as a percent of total of sum of
 * that column.
 *
 * @param {google.visualization.DataTable} dataTable Gviz datatable object.
 * @param {number} colIndex Row index we want values for.
 * @return {Array.<number>} Array of values representing % of total.
 */
gvizpivot.utils.getColumnPercentTotalArray = function(dataTable, colIndex) {
  var colValues = gvizpivot.utils.getColumnEntries(dataTable, colIndex);
  return gvizpivot.utils.getPercentTotalArray(colValues);
};

/**
 * Gets values of an column represented as a percent of total of sum of
 * that row.
 *
 * @param {google.visualization.DataTable} dataTable Gviz datatable object.
 * @param {number} colIndex Row index we want values for.
 * @return {Array.<number>} Array of values representing % of total.
 */
gvizpivot.utils.getRowPercentTotalArray = function(dataTable, rowIndex, colIndexes) {
  var rowValues = gvizpivot.utils.getRowValues(dataTable, rowIndex, colIndexes);
  return gvizpivot.utils.getPercentTotalArray(rowValues);
};
