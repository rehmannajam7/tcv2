import axios, { AxiosResponse } from 'axios';
import SelectElement, {
  SelectOption,
} from 'components/form/select/SelectElement';
import i18n from 'config/i18n';
import { getCookie, getAuthToken } from 'external';
import React from 'react';
import { TembaSelectStyle } from 'temba/TembaSelect';
import { createUUID } from 'utils';
import styles from './attachments.module.scss';
import TextInputElement, {
  TextInputSizes,
} from 'components/form/textinput/TextInputElement';

// @ts-ignore
import Unnnic from '@weni/unnnic-system';
import { applyVueInReact } from 'veaury';

const UnnnicIcon = applyVueInReact(Unnnic.unnnicIcon);

export interface Attachment {
  type: string;
  url: string;
  uploaded?: boolean;
}

const MAX_ATTACHMENTS = 3;

const TYPE_OPTIONS: SelectOption[] = [
  { value: 'image', name: i18n.t('forms.image_url', 'Image URL') },
  { value: 'audio', name: i18n.t('forms.audio_url', 'Audio URL') },
  { value: 'video', name: i18n.t('forms.video_url', 'Video URL') },
  { value: 'application', name: i18n.t('forms.pdf_url', 'PDF Document URL') },
];

const NEW_TYPE_OPTIONS = TYPE_OPTIONS.concat([
  {
    value: 'upload',
    name: i18n.t('forms.upload_attachment', 'Upload Attachment'),
  },
]);

// we would prefer that attachmetns be entirely stateless, but we have this
// tiny bit of state for simplicity with the reasonable assumption that only
// one batch of attachments are rendered at once
let filePicker: any;

const getAttachmentTypeOption = (type: string): SelectOption => {
  return TYPE_OPTIONS.find((option: SelectOption) => option.value === type);
};

export const handleUploadFile = (
  endpoint: string,
  files: FileList,
  onSuccess: (response: AxiosResponse) => void,
): void => {
  const csrf = getCookie('csrftoken');
  const headers: any = csrf ? { 'X-CSRFToken': csrf } : {};
  headers['X-Requested-With'] = 'XMLHttpRequest';

  const authToken = getAuthToken();
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
    headers['api-access-token'] = authToken;
  }

  const data = new FormData();
  data.append('file', files[0]);
  axios
    .post(endpoint, data, { headers })
    .then(onSuccess)
    .catch(error => {
      console.log(error);
    });
};

const renderWithLabel = (index: number, children: JSX.Element): JSX.Element => {
  return (
    <div key={index} className={styles.url_attachment_container}>
      <div
        className={`${styles.label} u font secondary body-md color-neutral-cloudy`}
      >
        {i18n.t('forms.file', 'File')} {index + 1}
      </div>
      {children}
    </div>
  );
};

export const renderAttachments = (
  endpoint: string,
  attachments: Attachment[],
  onUploaded: (response: AxiosResponse) => void,
  onAttachmentChanged: (index: number, value: string, url: string) => void,
  onAttachmentRemoved: (index: number) => void,
): JSX.Element => {
  const renderedAttachments = attachments.map((attachment, index: number) =>
    renderWithLabel(
      index,
      attachment.uploaded
        ? renderUpload(index, attachment, onAttachmentRemoved)
        : renderAttachment(
            index,
            attachment,
            onAttachmentChanged,
            onAttachmentRemoved,
          ),
    ),
  );

  const emptyOption =
    attachments.length < MAX_ATTACHMENTS
      ? renderWithLabel(
          attachments.length,
          renderAttachment(
            -1,
            { url: '', type: '' },

            onAttachmentChanged,
            onAttachmentRemoved,
          ),
        )
      : null;
  return (
    <>
      <div className="u font secondary body-md color-neutral-cloudy">
        {i18n.t(
          'forms.send_msg_summary',
          'Add an attachment to each message. The attachment can be a file you upload or a dynamic URL using expressions and variables from your Flow.',
          { count: MAX_ATTACHMENTS },
        )}
      </div>
      {renderedAttachments}
      {emptyOption}
      <input
        style={{
          display: 'none',
        }}
        ref={ele => {
          filePicker = ele;
        }}
        type="file"
        onChange={e => handleUploadFile(endpoint, e.target.files, onUploaded)}
      />
    </>
  );
};

export const renderUpload = (
  index: number,
  attachment: Attachment,
  onAttachmentRemoved: (index: number) => void,
): JSX.Element => {
  return (
    <div
      className={styles.url_attachment}
      key={index > -1 ? 'url_attachment_' + index : createUUID()}
    >
      <div className={styles.type_choice}>
        <SelectElement
          key={'attachment_type_' + index}
          name={i18n.t('forms.type', 'Type')}
          style={TembaSelectStyle.small}
          entry={{
            value: { name: attachment.type },
          }}
          options={TYPE_OPTIONS}
          disabled={true}
        />
      </div>
      <div className={styles.url}>
        <div className={styles.upload}>
          <div className={`u font secondary body-md color-neutral-cloudy`}>
            {attachment.url.substring(attachment.url.lastIndexOf('/') + 1)}
          </div>
        </div>
      </div>
      <div className={styles.download}>
        <UnnnicIcon
          icon="download-bottom-1"
          size="sm"
          scheme="neutral-cloudy"
          clickable
          onClick={() => {
            window.open(attachment.url, '_blank');
          }}
        />
      </div>
      <div className={styles.remove}>
        <UnnnicIcon
          icon="delete-1-1"
          size="sm"
          scheme="neutral-cloudy"
          clickable
          onClick={() => onAttachmentRemoved(index)}
        />
      </div>
    </div>
  );
};

export const renderAttachment = (
  index: number,
  attachment: Attachment,
  onAttachmentChanged: (index: number, type: string, url: string) => void,
  onAttachmentRemoved: (index: number) => void,
): JSX.Element => {
  return (
    <div
      className={styles.url_attachment}
      key={index > -1 ? 'url_attachment_' + index : createUUID()}
    >
      <div className={styles.type_choice}>
        <SelectElement
          key={'attachment_type_' + index}
          style={TembaSelectStyle.small}
          name={i18n.t('forms.type_options', 'Type Options')}
          placeholder={i18n.t(
            'forms.select_the_file_type',
            'Select the file type',
          )}
          entry={{
            value: index > -1 ? getAttachmentTypeOption(attachment.type) : null,
          }}
          onChange={(option: any) => {
            if (option.value === 'upload') {
              window.setTimeout(() => {
                filePicker.click();
              }, 0);
            } else {
              onAttachmentChanged(
                index,
                option.value,
                index === -1 ? '' : attachment.url,
              );
            }
          }}
          options={index > -1 ? TYPE_OPTIONS : NEW_TYPE_OPTIONS}
        />
      </div>
      {index > -1 ? (
        <>
          <div className={styles.url}>
            <TextInputElement
              placeholder={i18n.t('forms.ex_weni', 'Ex: weni.ai')}
              name={i18n.t('forms.url', 'URL')}
              size={TextInputSizes.sm}
              onChange={(value: string) => {
                onAttachmentChanged(index, attachment.type, value);
              }}
              entry={{ value: attachment.url }}
              autocomplete={true}
            />
          </div>
          <div className={styles.remove}>
            <UnnnicIcon
              data-testid={`remove-attachment-${index}`}
              icon="delete-1-1"
              size="sm"
              scheme="neutral-cloudy"
              clickable
              onClick={() => onAttachmentRemoved(index)}
            />
          </div>
        </>
      ) : (
        <>
          <div className={styles.url}></div>
          <div className={styles.remove}></div>
        </>
      )}
    </div>
  );
};
