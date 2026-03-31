import { createUUID } from 'utils';
import { Types } from '../config/interfaces';
import { CanvasDraggableProps } from './canvas/CanvasDraggable';

export default class {
  dicForNewUuids = {};

  createNewUuids(array: any): any {
    if (array instanceof Array) {
      return array.map(this.createNewUuids.bind(this));
    } else if (array instanceof Object) {
      const i = {};

      for (const key in array) {
        let newKey = key;

        if (
          /^update:[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/.test(
            newKey,
          )
        ) {
          // @ts-ignore
          if (!this.dicForNewUuids[newKey]) {
            // @ts-ignore
            this.dicForNewUuids[newKey] = createUUID();
          }

          // @ts-ignore
          newKey = this.dicForNewUuids[newKey];
        }

        // @ts-ignore
        i[newKey] = this.createNewUuids.bind(this)(array[key]);
      }

      return i;
    } else if (typeof array === 'string') {
      if (
        /^update:[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/.test(
          array,
        )
      ) {
        // @ts-ignore
        if (!this.dicForNewUuids[array]) {
          // @ts-ignore
          this.dicForNewUuids[array] = createUUID();
        }

        // @ts-ignore
        return this.dicForNewUuids[array];
      }
    }

    return array;
  }

  replaceUuidsToUpdate(array: any, staticUuids: string[]): any {
    if (array instanceof Array) {
      return array.map((element: any) =>
        this.replaceUuidsToUpdate.bind(this)(element, staticUuids),
      );
    } else if (array instanceof Object) {
      const i = {};

      for (const key in array) {
        let newKey = key;

        if (
          /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/.test(
            newKey,
          ) &&
          !staticUuids.includes(newKey)
        ) {
          newKey = newKey.replace(
            /^([0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12})$/,
            'update:$1',
          );
        }

        // @ts-ignore
        i[newKey] = this.replaceUuidsToUpdate.bind(this)(
          array[key],
          staticUuids,
        );
      }

      return i;
    } else if (typeof array === 'string') {
      if (
        /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/.test(
          array,
        ) &&
        !staticUuids.includes(array)
      ) {
        return array.replace(
          /^([0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12})$/,
          'update:$1',
        );
      }
    }

    return array;
  }

  getStaticUuids(selectedNodes: CanvasDraggableProps[]): string[] {
    const staticUuids: string[] = [];

    selectedNodes.forEach((selected: CanvasDraggableProps) => {
      if (selected.config.node.actions) {
        selected.config.node.actions.forEach((action: any) => {
          // Enter another flow
          if (action.type === Types.enter_flow) {
            staticUuids.push(action.flow.uuid);
          }

          // Add to group
          if (action.type === Types.add_contact_groups) {
            action.groups.forEach((group: any) => {
              staticUuids.push(group.uuid);
            });
          }

          // Remove from group
          if (action.type === Types.remove_contact_groups) {
            action.groups.forEach((group: any) => {
              staticUuids.push(group.uuid);
            });
          }

          // Send broadcast
          if (action.type === Types.send_broadcast) {
            action.contacts.forEach((contact: any) => {
              staticUuids.push(contact.uuid);
            });

            action.groups.forEach((group: any) => {
              staticUuids.push(group.uuid);
            });
          }

          // Open ticket
          if (action.type === Types.open_ticket) {
            staticUuids.push(action.ticketer.uuid);
            staticUuids.push(action.topic.uuid);
          }

          // Call external service
          if (action.type === Types.call_external_service) {
            staticUuids.push(action.external_service.uuid);

            if (action.call.name === 'ConsultarChatGPT') {
              const promptParams = action.params.find(
                (param: any) => param.type === 'AditionalPrompts',
              );

              if (promptParams) {
                promptParams.options.forEach((option: any) => {
                  staticUuids.push(option.uuid);
                });

                promptParams.data.value.forEach((value: any) => {
                  staticUuids.push(value.uuid);
                });
              }
            }
          }

          // Add label
          if (action.type === Types.add_input_labels) {
            action.labels.forEach((label: any) => {
              staticUuids.push(label.uuid);
            });
          }

          // Start session
          if (action.type === Types.start_session) {
            staticUuids.push(action.flow.uuid);

            action.contacts.forEach((contact: any) => {
              staticUuids.push(contact.uuid);
            });

            action.groups.forEach((group: any) => {
              staticUuids.push(group.uuid);
            });
          }

          // Split by intent
          if (action.type === Types.call_classifier) {
            staticUuids.push(action.classifier.uuid);
          }
        });
      }

      if (selected.config.node.router) {
        selected.config.node.router.cases &&
          selected.config.node.router.cases.forEach((caseElement: any) => {
            caseElement.arguments.forEach((argument: any) => {
              if (
                /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/.test(
                  argument,
                )
              ) {
                staticUuids.push(argument);
              }
            });
          });
      }
    });

    return staticUuids;
  }
}
