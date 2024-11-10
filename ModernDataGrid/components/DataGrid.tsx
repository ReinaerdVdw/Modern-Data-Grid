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
    previousParameters: { [key in keyof IInputs]?: any };
    enabled: boolean;
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
            columns: [],
            previousParameters: {},
            enabled: props.context.parameters.enabled.raw ?? true
        };
    }

    componentDidMount() {
        (window as any).context = this.props.context;
        if (this.props.context.parameters.DataSource && !this.props.context.parameters.DataSource.loading) {
            this.mapRecordsToState();
        } else {
            console.log("Data source not ready at mount.");
        }
        this.saveCurrentParametersToState();
        const cardElement = document.querySelector('.card');
        if (cardElement && cardElement.parentElement && cardElement.parentElement.parentElement) {
            cardElement.parentElement.parentElement.style.overflowY = 'auto';
            cardElement.parentElement.parentElement.style.overflowX = 'auto';
        }
    }

    saveCurrentParametersToState() {
        const { context } = this.props;
        const parameterValues: { [key in keyof IInputs]?: any } = {};

        Object.keys(context.parameters).forEach((key) => {
            const param = context.parameters[key as keyof IInputs];
            if (this.hasRawProperty(param)) {
                parameterValues[key as keyof IInputs] = param.raw;
            }
        });

        this.setState({ previousParameters: parameterValues });
    }

    mapRecordsToState() {
        const { context } = this.props;
        const dataSet = context.parameters.DataSource as ComponentFramework.PropertyTypes.DataSet;
        if (dataSet && !dataSet.loading && dataSet.sortedRecordIds.length > 0) {
            const dataSet = context.parameters.DataSource as ComponentFramework.PropertyTypes.DataSet;
            //console.log('DataSet:', dataSet);

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

            //console.log('Mapped Records:', records);

            // Update records and columns in state
            this.setState({
                records,
                columns: dataSet.columns
            });
        }
    }

    componentDidUpdate(prevProps: Readonly<DataGridProps>, prevState: Readonly<DataGridState>): void {
        //console.log("Component did update");
        const { context } = this.props;
        const dataSet = context.parameters.DataSource as ComponentFramework.PropertyTypes.DataSet;
        // Check if columns have changed
        if (prevProps.context.parameters.enabled.raw !== this.props.context.parameters.enabled.raw) {
            this.setState({ enabled: this.props.context.parameters.enabled.raw ?? true });
        }
        if (JSON.stringify(prevState.columns) !== JSON.stringify(dataSet.columns)) {
            //console.log("Columns have changed. Updating state with new columns.");
            this.mapRecordsToState();

            const newFilters = dataSet.columns.reduce((acc: any, col: any) => {
                acc[col.name] = acc[col.name] || {
                    operator: FilterOperator.AND,
                    constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }]
                };
                return acc;
            }, {});

            //console.log("New Filters:", newFilters);
            //console.log("Previous Filters:", prevState.filters);

            // Update the filters state only if it has actually changed
            if (JSON.stringify(prevState.filters) !== JSON.stringify(newFilters)) {
                //console.log("Filters have changed. Updating state with new filters.");
                this.setState({ filters: newFilters });
            } else {
                //console.log("Filters have not changed. No state update needed.");
            }
        } else {
            //console.log("Columns have not changed. No state update needed.");
        }
    }
    hasRawProperty(param: any): param is { raw: any } {
        return param && typeof param === 'object' && 'raw' in param;
    }

    // Triggers when new data set is loaded in
    shouldComponentUpdate(nextProps: Readonly<DataGridProps>, nextState: Readonly<DataGridState>): boolean {
        //console.log("should component update");

        const parameterKeys: (keyof IInputs)[] = Object.keys(nextProps.context.parameters) as (keyof IInputs)[];

        for (const key of parameterKeys) {
            const nextParam = nextProps.context.parameters[key];
            const previousParam = this.state.previousParameters[key];

            // Check if the parameter has a 'raw' property before accessing it
            if (this.hasRawProperty(nextParam)) {
                const nextRaw = nextParam.raw;
                const hasRawCurrent = this.hasRawProperty(previousParam);

                // console.log(`Checking parameter '${key}':`, {
                //     previousParam: hasRawCurrent ? previousParam?.raw : previousParam,
                //     nextParam: nextRaw,
                //     hasRaw: true
                // });

                if (previousParam !== nextRaw) {
                    //console.log(`Parameter '${key}' has changed. Previous:`, previousParam, "Next:", nextRaw);
                    return true;
                }
            } else {
                //console.log(`Parameter '${key}' does not have a 'raw' property. Skipping check.`);
            }
        }

        // Compare columns as before
        const currentColumns = this.state.columns;
        const nextColumns = nextProps.context.parameters.DataSource.columns;

        // console.log("Comparing columns:", {
        //     currentColumns,
        //     nextColumns,
        //     columnsChanged: JSON.stringify(currentColumns) !== JSON.stringify(nextColumns)
        // });

        if (JSON.stringify(currentColumns) !== JSON.stringify(nextColumns)) {
            //console.log("Columns have changed. Component should update.");
            return true;
        }

        //console.log("No changes detected, component should not update.");
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
        const gridIsEnabled = this.props.context.parameters.enabled.raw ?? false;
        if (!gridIsEnabled) {
            return;
        }
        const newSelectedRecordIds = e.value.map((record: any) => record.id);
        this.props.context.parameters.DataSource.setSelectedRecordIds(newSelectedRecordIds)
        this.setState({
            selectedRecordIds: newSelectedRecordIds,
            selectedRecords: e.value,
        }, () => {
            this.forceUpdate();
        });
    };

    renderHeader() {
        const displayHeader = this.props.context.parameters.displayHeader.raw ?? false;
        const displaySearch = this.props.context.parameters.displaySearch.raw ?? false;
        const headerText = this.props.context.parameters.headerText.raw ?? "";
        
        if (!displayHeader) {
            return null;
        }

        return (
            <div className="flex flex-wrap gap-2 justify-content-between align-items-center">
                <h4 className="m-0">{headerText}</h4>
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
        const displayPagination = context.parameters.displayPagination.raw ?? false;
        const emptyMessage = context.parameters.emptyMessage.raw ?? "No records found.";
        const filterDisplayType = context.parameters.filterDisplayType.raw === "menu" || context.parameters.filterDisplayType.raw === "row"
            ? context.parameters.filterDisplayType.raw
            : "menu";
        const defaultRows = context.parameters.defaultRows.raw ?? 10;
        const allowedSelectionModes: Array<"multiple" | "checkbox"> = ["multiple", "checkbox"];
        const selectionMode = (context.parameters.selectionMode.raw && allowedSelectionModes.includes(context.parameters.selectionMode.raw as any))
            ? (context.parameters.selectionMode.raw as "multiple" | "checkbox")
            : "multiple";
        const allowSorting = context.parameters.allowSorting.raw ?? false;
        const allowFiltering = context.parameters.allowFiltering.raw ?? false;
        const rowsPerPageOptions = [10, 25, 50];
        const onRenderItemColumn = (
            item?: Record<string, any>,
            index?: number,
            column?: IColumn,
        ) => {
            console.log("Rendering item column:");
            console.log("Item:", item);
            console.log("Index:", index);
            console.log("Column:", column);

            if (column && column.fieldName && item) {
                const value = item[column.fieldName];
                console.log(`Value for field '${column.fieldName}':`, value);

                if (value && typeof value === 'object' && value.toString) {
                    console.log("Value is an object, using toString():", value.toString());
                    return value.toString();
                }

                if (value == null) {
                    console.log(`Value for field '${column.fieldName}' is null or undefined.`);
                }

                return value ?? '';
            }

            console.log("Returning null for the column render.");
            return null;
        };

        type IColumn = {
            fieldName: string;
        };
        return (
            <div className="card" style={{ display: 'flex', width: '100%', height: '100%', overflow: 'auto' }}>
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
                    scrollable
                    scrollHeight="flex"
                    style={{ width: '100%', minWidth: '0' }}
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
                            body={(item) => onRenderItemColumn(item, undefined, { fieldName: col.name } as IColumn)}
                        />
                    ))}
                </DataTable>
            </div>
        );
    }
}

export default DataGrid;