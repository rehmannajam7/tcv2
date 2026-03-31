import { react as bindCallbacks } from 'auto-bind';
import { FormEntry, FormState, mergeForm } from 'store/nodeEditor';
import * as React from 'react';
import styles from './ParamList.module.scss';
import { ServiceCallParam } from 'config/interfaces';
import {
  SortEnd,
  SortableContainer,
  SortableElement,
  arrayMove,
} from 'react-sortable-hoc';
import ParamElement from 'components/flow/routers/param/ParamElement';
import { createEmptyParam } from './helpers';

export interface ParamProps extends ServiceCallParam {
  uuid: string;
  filter: FormEntry;
  data: FormEntry;
  valid: boolean;
}

export interface ParamListProps {
  availableParams: ServiceCallParam[];
  params: ParamProps[];
  shouldCreateEmptyParam: boolean;
  onParamsUpdated(params: ParamProps[]): void;
}

export interface ParamListState extends FormState {
  currentParams: ParamProps[];
}

const SortableItem = SortableElement(({ value: row }: any) => {
  const item = row.item;
  return (
    <div className={styles.param + ' param_list_param'}>
      <ParamElement
        key={item.uuid}
        initialParam={item}
        availableParams={item.availableParams}
        onRemove={row.list.handleRemoveParam}
        onChange={row.list.handleUpdateParam}
        hasArrangeFunctionality={row.list.props.shouldCreateEmptyParam}
      />
    </div>
  );
});

export default class ParamList extends React.Component<
  ParamListProps,
  ParamListState
> {
  private sortableList = SortableContainer(({ items }: any) => {
    return (
      <div className={styles.param_list}>
        {items.map((value: any, index: any) => (
          <SortableItem
            key={`item-${index}`}
            index={index}
            value={{
              item: { ...value, availableParams: this.props.availableParams },
              list: this,
            }}
            disabled={
              index === this.state.currentParams.length - 1 ||
              (value.required ||
                (value.filter &&
                  value.filter.value &&
                  value.filter.value.required))
            }
            shouldCancelStart={(e: any) => {
              console.log(e);
              return true;
            }}
          />
        ))}
      </div>
    );
  });

  constructor(props: ParamListProps) {
    super(props);

    bindCallbacks(this, {
      include: [/^handle/],
    });

    const paramProps = this.props.params;

    if (this.props.shouldCreateEmptyParam && !this.hasEmptyParam(paramProps)) {
      paramProps.push(this.createEmptyParam());
    }

    this.state = {
      currentParams: paramProps,
      valid: true,
    };
  }

  // eslint-disable-next-line react/no-deprecated
  public componentWillReceiveProps(nextProps: Readonly<ParamListProps>): void {
    if (nextProps.params !== this.props.params) {
      this.setState({ currentParams: nextProps.params });
    }
  }

  componentDidUpdate(): void {
    if (
      this.props.shouldCreateEmptyParam &&
      !this.hasEmptyParam(this.state.currentParams) &&
      this.hasAvailableParam()
    ) {
      this.handleUpdate({ paramProps: this.createEmptyParam() });
    }
  }

  private hasEmptyParam(params: ParamProps[]): boolean {
    const emptyParam = params.find((paramProps: ParamProps) => {
      if (
        typeof paramProps.data.value === 'string' ||
        paramProps.data.value instanceof String
      ) {
        return paramProps.data.value.trim().length === 0;
      }

      return false;
    });

    return emptyParam !== undefined;
  }

  private hasAvailableParam() {
    return this.props.availableParams.length > 0;
  }

  private createEmptyParam(): ParamProps {
    return createEmptyParam();
  }

  private handleUpdate(keys: { paramProps?: ParamProps; removeParam?: any }) {
    const updates: Partial<ParamListState> = {};

    if (keys.hasOwnProperty('paramProps')) {
      updates.currentParams = [keys.paramProps];
      if (!keys.paramProps.valid) {
        // TODO: refactor this to be a form entry
        // mock our case to have validation failures, this is so the case list sees
        // the existence of errors which mergeForm uses when merging form validity
        // (keys.caseProps as any).validationFailures = [{ message: 'invalid case' }];
        updates.valid = false;
      }
    }

    let toRemove: any[] = [];
    if (keys.hasOwnProperty('removeParam')) {
      toRemove = [{ currentParams: [keys.removeParam] }];
    }

    // update our form
    this.setState((prevState: ParamListState) => {
      const updated = mergeForm(prevState, updates, toRemove) as ParamListState;

      // notify our listener
      this.props.onParamsUpdated(updated.currentParams);
      return updated;
    });
  }

  private handleRemoveParam(uuid: string) {
    return this.handleUpdate({
      removeParam: { uuid },
    });
  }

  private handleUpdateParam(paramProps: ParamProps) {
    this.handleUpdate({ paramProps });
  }

  private handleSortEnd({ oldIndex, newIndex }: SortEnd): void {
    this.setState(
      ({ currentParams }) => ({
        currentParams: arrayMove(
          currentParams,
          oldIndex,
          newIndex === this.state.currentParams.length - 1
            ? newIndex - 1
            : newIndex,
        ),
      }),
      () => {
        this.props.onParamsUpdated(this.state.currentParams);
      },
    );
  }

  public render(): JSX.Element {
    return (
      <div
        className={
          styles.param_list_container +
          ' ' +
          (this.state.currentParams.length > 5 ? styles.scrolling : '')
        }
        tabIndex={0}
      >
        <this.sortableList
          items={this.state.currentParams}
          onSortEnd={this.handleSortEnd}
          shouldCancelStart={(e: React.MouseEvent<HTMLDivElement>) => {
            if (e.target.constructor.name === 'SVGSVGElement') {
              return !(e.target as any).dataset.draggable;
            }

            if (!(e.target instanceof HTMLElement)) {
              return true;
            }
            return !e.target.dataset.draggable;
          }}
        />
      </div>
    );
  }
}
