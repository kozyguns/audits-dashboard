// src/app\admin\reports\sales\columns.tsx

import { format } from "date-fns";
import { ColumnDef as BaseColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "./data-table-column-header";
import SalesTableRowActions from "./sales-table-row-actions";
import { includesArrayString } from "./custom-filter";

export interface SalesData {
  id: number;
  Lanid: string;
  Invoice: number;
  Sku: string;
  Desc: string;
  SoldPrice: number;
  SoldQty: number;
  Cost: number;
  Acct: number;
  Date: string;
  Disc: number;
  Type: string;
  Spiff: number;
  Last: string;
  LastName: string;
  Legacy: string;
  Stloc: number;
  Cat: number;
  Sub: number;
  Mfg: string;
  CustType: string;
  category_label: string;
  subcategory_label: string;
  status: string;
  total_gross: number;
  total_net: number;
}

export type ColumnDef<TData, TValue = unknown> = BaseColumnDef<
  TData,
  TValue
> & {
  meta?: {
    style?: React.CSSProperties;
  };
};

export const salesColumns = (
  onUpdate: (id: number, updates: Partial<SalesData>) => void
): ColumnDef<SalesData>[] => [
  {
    accessorKey: "Lanid",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Lanid" />
    ),
    meta: {
      style: { width: "150px" },
    },
  },
  {
    accessorKey: "Invoice",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Invoice" />
    ),
    meta: {
      style: { width: "150px" },
    },
  },
  {
    accessorKey: "Sku",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Sku" />
    ),
    meta: {
      style: { width: "200px" },
    },
  },
  {
    accessorKey: "Desc",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Desc" />
    ),
    meta: {
      style: { width: "200px" },
    },
  },
  {
    accessorKey: "SoldPrice",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Sold Price" />
    ),
    meta: {
      style: { width: "100px" },
    },
  },
  {
    accessorKey: "SoldQty",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Sold Qty" />
    ),
    meta: {
      style: { width: "100px" },
    },
  },
  {
    accessorKey: "Cost",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Cost" />
    ),
    meta: {
      style: { width: "100px" },
    },
  },
  {
    accessorKey: "Acct",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Acct" />
    ),
    meta: {
      style: { width: "100px" },
    },
  },
  {
    accessorKey: "Date",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
    cell: ({ row }) => format(new Date(row.original.Date), "MM-dd-yyyy"), // Format the date here
    meta: {
      style: { width: "120px" },
    },
    sortingFn: "datetime",
    filterFn: (row, columnId, filterValue) => {
      const formattedDate = format(
        new Date(row.getValue(columnId)),
        "yyyy-MM-dd"
      );
      return formattedDate.includes(filterValue);
    },
  },
  {
    accessorKey: "Last",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Last" />
    ),
    meta: {
      style: { width: "150px" },
    },
  },
  {
    accessorKey: "LastName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="LastName" />
    ),
    meta: {
      style: { width: "150px" },
    },
  },
  {
    accessorKey: "Mfg",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Mfg" />
    ),
    meta: {
      style: { width: "150px" },
    },
  },
  {
    accessorKey: "CustType",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="CustType" />
    ),
    meta: {
      style: { width: "150px" },
    },
  },
  {
    accessorKey: "category_label",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Category Label" />
    ),
    meta: {
      style: { width: "150px" },
    },
  },
  {
    accessorKey: "subcategory_label",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Subcategory Label" />
    ),
    meta: {
      style: { width: "150px" },
    },
  },
  {
    accessorKey: "total_gross",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Total Gross" />
    ),
    meta: {
      style: { width: "150px" },
    },
  },
  {
    accessorKey: "total_net",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Total Net" />
    ),
    meta: {
      style: { width: "150px" },
    },
  },
];
