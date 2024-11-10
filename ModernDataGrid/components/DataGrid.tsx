import React, { Component } from 'react';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { IInputs } from "../generated/ManifestTypes";
import 'primereact/resources/themes/saga-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';
import "./DataGrid.css";

interface DataGridProps {
    context: ComponentFramework.Context<IInputs>;
}

interface DataGridState {
    records: any[];
    selectedRecordIds: any[];
    selectedRecords: any[];
    filters: any;
    globalFilterValue: string;
    columns: ComponentFramework.PropertyHelper.DataSetApi.Column[];
}

class DataGrid extends Component<DataGridProps, DataGridState> {
    static contextType = React.createContext<ComponentFramework.Context<IInputs> | undefined>(undefined);
    declare context: React.ContextType<typeof DataGrid.contextType>;
    constructor(props: DataGridProps) {
        super(props);
        this.state = {
            records: [],
            selectedRecords: [],
            selectedRecordIds: [],
            filters: props.context.parameters.DataSource.columns.reduce((acc: any, col: any) => {
                acc[col.name] = {
                    operator: FilterOperator.AND,
                    constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }]
                };
                return acc;
            }, {}),
            globalFilterValue: '',
            columns: []
        };
    }

    componentDidMount() {
        (window as any).context = this.props.context;
        this.mapRecordsToState();
    }

    mapRecordsToState() {
        const { context } = this.props;
        if (context.parameters.DataSource && !context.parameters.DataSource.loading) {
            const dataSet = context.parameters.DataSource as ComponentFramework.PropertyTypes.DataSet;
            console.log('DataSet:', dataSet);

            const records = dataSet.sortedRecordIds.map(recordId => {
                // for each record
                const record = dataSet.records[recordId];
                return {
                    id: recordId,
                    ...dataSet.columns.reduce((rec: Record<string, any>, col) => {
                        rec[col.name] = record.getValue(col.alias);
                        return rec;
                    }, {})
                };
            });

            console.log('Mapped Records:', records);

            // Update records and columns in state
            this.setState({
                records,
                columns: dataSet.columns
            });
        }
    }

    componentDidUpdate(prevProps: Readonly<DataGridProps>, prevState: Readonly<DataGridState>): void {
        console.log("Component did update")
        const { context } = this.props;
        const dataSet = context.parameters.DataSource as ComponentFramework.PropertyTypes.DataSet;

        // Check if columns have changed
        if (JSON.stringify(prevState.columns) !== JSON.stringify(dataSet.columns)) {
            this.mapRecordsToState();

            const newFilters = dataSet.columns.reduce((acc: any, col: any) => {
                acc[col.name] = acc[col.name] || {
                    operator: FilterOperator.AND,
                    constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }]
                };
                return acc;
            }, {});
    
            this.setState({ filters: newFilters });
        }
    }

    // Triggers when new data set is loaded in
    shouldComponentUpdate(nextProps: Readonly<DataGridProps>, nextState: Readonly<DataGridState>): boolean {

        const currentColumns = this.state.columns;
        const nextColumns = nextProps.context.parameters.DataSource.columns;

        if (JSON.stringify(currentColumns) !== JSON.stringify(nextColumns)) {
            return true;
        }
        return false;
    }

    onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        this.setState({
            globalFilterValue: value,
            filters: {
                ...this.state.filters,
                global: { value, matchMode: FilterMatchMode.CONTAINS }
            }
        }, () => {
            this.forceUpdate();
        });
    };

    onSelectionChange = (e: any) => {
        const newSelectedRecordIds = e.value.map((record: any) => record.id);
        console.log('New selected record IDs:', newSelectedRecordIds);
    
        this.setState({
            selectedRecordIds: newSelectedRecordIds,
            selectedRecords: e.value,
        }, () => {
            this.forceUpdate();
        });
    };

    renderHeader() {
        const displayHeader = this.props.context.parameters.displayHeader.raw ?? true;
        const displaySearch = this.props.context.parameters.displaySearch.raw ?? true;
    
        if (!displayHeader) {
            return <></>;
        }
    
        return (
            <div className="flex flex-wrap gap-2 justify-content-between align-items-center">
                <h4 className="m-0">Customers</h4>
                {displaySearch && (
                    <IconField iconPosition="left">
                        <InputIcon className="pi pi-search" />
                        <InputText
                            value={this.state.globalFilterValue}
                            onChange={this.onGlobalFilterChange}
                            placeholder="Keyword Search"
                        />
                    </IconField>
                )}
            </div>
        );
    }
    getFieldValue(col: ComponentFramework.PropertyHelper.DataSetApi.Column): string {
        return col.alias || col.name;
    }

    getRecordsFromContext(): any[] {
        const { context } = this.props;
        if (context.parameters.DataSource && !context.parameters.DataSource.loading) {
            const dataSet = context.parameters.DataSource as ComponentFramework.PropertyTypes.DataSet;
            //console.log('DataSet:', dataSet);

            const records = dataSet.sortedRecordIds.map(recordId => {
                const record = dataSet.records[recordId];
                return {
                    id: recordId,
                    ...dataSet.columns.reduce((rec: Record<string, any>, col) => {
                        rec[col.name] = record.getValue(col.alias);
                        console.log(rec)
                        return rec;
                    }, {})
                };
            });
            //console.log('Mapped Records:', records);
            return records;
        }
        return [];
    }
       
    render() {
        const { context } = this.props;
        const { records, selectedRecordIds, filters } = this.state;
        const header = this.renderHeader();

        const displayPagination = context.parameters.displayPagination.raw ?? true;
        const emptyMessage = context.parameters.emptyMessage.raw ?? "No records found.";
        const filterDisplayType = context.parameters.filterDisplayType.raw === "menu" || context.parameters.filterDisplayType.raw === "row"
            ? context.parameters.filterDisplayType.raw
            : "menu";
        const defaultRows = context.parameters.defaultRows.raw ?? 10;
        const allowedSelectionModes: Array<"multiple" | "checkbox"> = ["multiple", "checkbox"];
const selectionMode = (context.parameters.selectionMode.raw && allowedSelectionModes.includes(context.parameters.selectionMode.raw as any))
    ? (context.parameters.selectionMode.raw as "multiple" | "checkbox")
    : "multiple"; 
        const allowSorting = context.parameters.allowSorting.raw ?? true;
        const allowFiltering = context.parameters.allowFiltering.raw ?? true;
        const rowsPerPageOptions = context.parameters.rowsPerPageOptions.raw
            ? context.parameters.rowsPerPageOptions.raw.split(",").map(Number)
            : [10, 25, 50];

        return (
            <div className="card">
                <DataTable
                value={records}
                paginator={displayPagination}
                header={header}
                rows={defaultRows}
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                rowsPerPageOptions={rowsPerPageOptions}
                dataKey="id"
                selectionMode={selectionMode}
                selection={records.filter(record => selectedRecordIds.includes(record.id))}
                onSelectionChange={this.onSelectionChange}
                filters={filters}
                filterDisplay={filterDisplayType as "menu" | "row"}
                globalFilterFields={context.parameters.DataSource.columns.map(col => col.name)}
                emptyMessage={emptyMessage}
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
            >
                <Column selectionMode="multiple" headerStyle={{ width: '3rem' }}></Column>
                {context.parameters.DataSource.columns.map((col, index) => (
                    <Column
                        key={index}
                        field={col.name}
                        header={col.displayName}
                        sortable={allowSorting}
                        filter={allowFiltering}
                        filterPlaceholder={`Search by ${col.displayName}`}
                        showFilterMatchModes
                        style={{ minWidth: '12rem' }}
                    />
                ))}
            </DataTable>
            </div>
        );
    }
}

export default DataGrid;