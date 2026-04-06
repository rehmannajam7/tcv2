import axios, { AxiosResponse } from 'axios';
import i18n from 'config/i18n';
import { getCookie } from 'external';
import React from 'react';
import styles from './attachments.module.scss';
import Button, { ButtonTypes } from '../../../../button/Button';

export enum FILE_TYPE {
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  APPLICATION = 'application',
  UNKNOWN = 'unknown',
}
export const FILE_TYPE_REGEX = /\/[^/]+\.([0-9a-z]+)(?:[?#]|$)/i;
export const FILE_TYPE_MAP: Record<string, string> = {
  jpg: FILE_TYPE.IMAGE,
  jpeg: FILE_TYPE.IMAGE,
  png: FILE_TYPE.IMAGE,
  gif: FILE_TYPE.IMAGE,
  webp: FILE_TYPE.IMAGE,
  mp3: FILE_TYPE.AUDIO,
  ogg: FILE_TYPE.AUDIO,
  mp4: FILE_TYPE.VIDEO,
  pdf: FILE_TYPE.APPLICATION,
  doc: FILE_TYPE.APPLICATION,
  docx: FILE_TYPE.APPLICATION,
  xls: FILE_TYPE.APPLICATION,
  xlsx: FILE_TYPE.APPLICATION,
  ppt: FILE_TYPE.APPLICATION,
  pptx: FILE_TYPE.APPLICATION,
};

export interface Attachment {
  type: string;
  url: string;
  uploaded?: boolean;
}

export const handleUploadFile = (
  endpoint: string,
  files: FileList,
  onSuccess: (response: AxiosResponse) => void,
): void => {
  // if we have a csrf in our cookie, pass it along as a header
  const csrf = getCookie('csrftoken');
  const headers: any = csrf ? { 'X-CSRFToken': csrf } : {};

  // mark us as ajax
  headers['X-Requested-With'] = 'XMLHttpRequest';

  const data = new FormData();
  data.append('file', files[0]);
  axios
    .post(endpoint, data, { headers })
    .then(onSuccess)
    .catch(error => {
      console.log(error);
    });
};

export const renderUploadButton = (
  attachmentEndpoint: string,
  onAttachmentUploaded: (response: AxiosResponse) => void,
  disabled = false,
  size = 'default',
): JSX.Element => {
  let filePicker: any = null;

  const triggerAttachmentUpload = (): void => {
    filePicker.value = null;
    filePicker.click();
  };

  return (
    <div
      className={`${styles.upload_button} ${
        size === 'small' ? styles.small_upload_button : ''
      }`}
    >
      <Button
        type={ButtonTypes.secondary}
        name={size === 'default' ? i18n.t('buttons.upload', 'Upload') : ''}
        onClick={triggerAttachmentUpload}
        iconName={'upload-bottom-1'}
        size={'small'}
        disabled={disabled}
      />
      <input
        data-testid="upload-input"
        style={{
          display: 'none',
        }}
        ref={(ele: any) => {
          filePicker = ele;
        }}
        type="file"
        onChange={e => {
          return handleUploadFile(
            attachmentEndpoint,
            e.target.files,
            onAttachmentUploaded,
          );
        }}
      />
    </div>
  );
};
