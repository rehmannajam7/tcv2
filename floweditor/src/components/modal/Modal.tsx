import * as React from 'react';
import ReactModal from 'react-modal';
// @ts-ignore
import styles from './Modal.module.scss';

interface CustomStyles {
  content: { [cssProperty: string]: string | number };
}

export interface ModalProps {
  show: boolean;
  onClose?(): void;

  onModalOpen?: any;
  width?: string;
}

// A base modal for displaying messages or performing single button actions
export default class Modal extends React.Component<ModalProps> {
  public render(): JSX.Element {
    console.log('🔵 Modal: render called');
    console.log('🔵 Modal: show prop:', this.props.show);
    console.log('🔵 Modal: width prop:', this.props.width);
    console.log('🔵 Modal: onClose prop:', this.props.onClose);

    const customStyles: CustomStyles = {
      content: {
        marginLeft: 'auto',
        marginRight: 'auto',
        marginTop: '40px',
        bottom: 'initial',
        padding: 'none',
        borderRadius: 'none',
        outline: 'none',
        width: this.props.width ? this.props.width : '700px',
        border: 'none',
      },
    };

    console.log('🔵 Modal: customStyles:', customStyles);
    console.log('🔵 Modal: ReactModal isOpen will be:', this.props.show);

    return (
      <ReactModal
        ariaHideApp={false}
        isOpen={this.props.show}
        onAfterOpen={this.props.onModalOpen}
        onRequestClose={this.props.onClose}
        style={customStyles}
        shouldCloseOnOverlayClick={false}
        contentLabel="Modal"
        overlayClassName={styles.overlay}
      >
        {this.props.children}
      </ReactModal>
    );
  }
}
