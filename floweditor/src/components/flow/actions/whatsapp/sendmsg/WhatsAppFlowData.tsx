import { react as bindCallbacks } from 'auto-bind';
import * as React from 'react';

import styles from 'components/flow/actions/whatsapp/sendmsg/WhatsAppFlowData.module.scss';
import i18n from 'config/i18n';
import TextInputElement from 'components/form/textinput/TextInputElement';

import { FlowData } from 'components/flow/actions/whatsapp/sendmsg/SendWhatsAppMsgForm';
import { FormEntry, ValidationFailure } from 'store/nodeEditor';
import ContentCollapse from 'components/contentcollapse/ContentCollapse';
import { AxiosResponse } from 'axios';
import { renderUploadButton } from 'components/flow/actions/whatsapp/sendmsg/attachments';
import Button, { ButtonTypes } from '../../../../button/Button';

export interface WhatsAppFlowDataProps {
  data: FormEntry<FlowData>;
  attachmentNameMap: Record<string, string>;
  attachmentsEndpoint: string;
  onValueUpdated(key: string, value: string): boolean;
  onAttachmentNameUpdated(key: string, value: string): boolean;
}

export default class WhatsAppFlowData extends React.Component<
  WhatsAppFlowDataProps
> {
  constructor(props: WhatsAppFlowDataProps) {
    super(props);

    bindCallbacks(this, {
      include: [/^on/, /^handle/],
    });
  }

  handleAttachmentUploaded(key: string, response: AxiosResponse) {
    this.props.onValueUpdated(key, response.data.url);

    const attachmentName = response.data.url.substring(
      response.data.url.lastIndexOf('/') + 1,
    );
    this.props.onAttachmentNameUpdated(key, attachmentName);
  }

  public render(): JSX.Element {
    const hasError =
      this.props.data.validationFailures &&
      this.props.data.validationFailures.length > 0;

    const data = this.props.data.value;

    return (
      <ContentCollapse
        title={i18n.t(
          'forms.dynamic_variables.config.highlight',
          'Configure imported dynamic variables',
        )}
        description={i18n.t(
          'forms.dynamic_variables.config.description',
          'Fill in the fields below with code expression like "@contact.name" or attach an image (jpeg, png), video (mp4), or document (pdf, docx) file.',
        )}
        open={true}
        whiteBackground
        optional
      >
        <div className={styles.list_items}>
          <div className={styles.item}>
            <span className={styles.options_name}>
              {i18n.t('forms.dynamic_variables.label', 'Imported field')}
            </span>
            <span className={styles.options_value}>
              {i18n.t(
                'forms.dynamic_variables.value',
                'Add a field value or attach a file',
              )}
            </span>
          </div>
          {Object.entries(data).map(([key, value]) => {
            const attachmentName = this.props.attachmentNameMap[key] || null;
            return (
              <div key={key} className={styles.item}>
                <div className={styles.name}>
                  <TextInputElement
                    name={key}
                    entry={{ value: key }}
                    disabled={true}
                  />
                </div>
                <div className={styles.value}>
                  {attachmentName ? (
                    <span className={styles.attachment_title}>
                      {attachmentName ||
                        i18n.t(
                          'forms.dynamic_variables.attached_file',
                          'Attached file',
                        )}
                    </span>
                  ) : (
                    <TextInputElement
                      __className={styles.variable}
                      name={`${key}-value`}
                      entry={{ value }}
                      onChange={e => this.props.onValueUpdated(key, e)}
                      focus={true}
                      disabled={!!attachmentName}
                      autocomplete
                    />
                  )}
                </div>

                {attachmentName ? (
                  <div className={styles.remove_attachment}>
                    <Button
                      type={ButtonTypes.secondary}
                      name={''}
                      onClick={() => this.props.onValueUpdated(key, '')}
                      iconName={'close'}
                      size={'small'}
                    />
                  </div>
                ) : (
                  renderUploadButton(
                    this.props.attachmentsEndpoint,
                    (response: AxiosResponse) => {
                      this.handleAttachmentUploaded(key, response);
                    },
                    !attachmentName && value.trim().length !== 0,
                    'small',
                  )
                )}
              </div>
            );
          })}
        </div>

        {hasError ? (
          <div data-testid="Error message" className={styles.error_message}>
            {this.props.data.validationFailures.map(
              (error: ValidationFailure) => error.message,
            )}
          </div>
        ) : null}
      </ContentCollapse>
    );
  }
}
