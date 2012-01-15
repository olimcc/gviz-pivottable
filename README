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