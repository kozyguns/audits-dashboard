import * as React from "react";
import {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { DataTablePagination } from "@/app/admin/audits/review/pagination";
import { ColumnDef, AuditData } from "@/app/admin/audits/review/columns"; // Import the extended type and AuditData type

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: false, // Set based on your data handling strategy
    manualSorting: false, // Set based on your data handling strategy
  });

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex flex-row items-center justify-between mx-2 my-2">
        <Input
          placeholder="Filter By Sales Rep..."
          value={table.getColumn("salesreps")?.getFilterValue() as string}
          onChange={(event) =>
            table.getColumn("salesreps")?.setFilterValue(event.target.value)
          }
          className="max-w-sm w-full"
        />
        <Input
          placeholder="Filter By DROS"
          value={table.getColumn("dros_number")?.getFilterValue() as string}
          onChange={(event) =>
            table.getColumn("dros_number")?.setFilterValue(event.target.value)
          }
          className="max-w-sm w-full ml-2"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex-1 overflow-hidden rounded-md border w-full sm:w-full md:w-full lg:min-w-8xl lg:max-w-8xl">
        <div className="h-[calc(100vh-200px)] overflow-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const metaStyle = (
                      header.column.columnDef.meta as {
                        style?: React.CSSProperties;
                      }
                    )?.style;
                    return (
                      <TableHead
                        key={header.id}
                        style={metaStyle} // Apply the fixed width style
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const metaStyle = (
                        cell.column.columnDef.meta as {
                          style?: React.CSSProperties;
                        }
                      )?.style;
                      return (
                        <TableCell
                          key={cell.id}
                          style={metaStyle} // Apply the fixed width style
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="flex-none mt-4">
        <DataTablePagination table={table} />
      </div>
    </div>
  );
}
