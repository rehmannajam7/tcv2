import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import AppState from 'store/state';

import {
  DispatchWithState,
  mergeEditorState,
  MergeEditorState,
} from 'store/thunks';

import { applyVueInReact } from 'veaury';
import styles from './GuidingSteps.module.scss';
// @ts-ignore
import Unnnic from '@weni/unnnic-system';
import i18n from '../../config/i18n';

const UnnnicButton = applyVueInReact(Unnnic.unnnicButton, {
  vue: {
    componentWrap: 'div',
    slotWrap: 'div',
    componentWrapAttrs: {
      style: {
        all: '',
      },
    },
  },
});

export interface GuidingStepsProps {
  currentGuide: string;
  guidingStep: number;
  mergeEditorState: MergeEditorState;

  guide: string;
  step: number;
  title: string;
  description: string;
  buttonText: string;
  side?: string;
  align?: string;
  action?: () => void;
}

export class GuidingSteps extends React.Component<
  GuidingStepsProps & React.HTMLAttributes<HTMLDivElement>,
  {}
> {
  private stopGuiding(): void {
    this.props.mergeEditorState({ guidingStep: -1, currentGuide: null });
  }

  private nextGuide(): void {
    this.props.mergeEditorState({ guidingStep: this.props.guidingStep + 1 });

    if (this.props.action) {
      this.props.action();
    }
  }

  private shouldRenderGuide(): boolean {
    return (
      this.props.currentGuide === this.props.guide &&
      this.props.guidingStep === this.props.step
    );
  }

  public render(): JSX.Element {
    const directionStyle = this.props.side
      ? styles[this.props.side]
      : styles.right;
    const arrowAlign = this.props.align
      ? styles[this.props.align]
      : styles.arrow_center;

    return (
      <div className={styles.guiding_wrapper}>
        {this.props.children}
        {this.shouldRenderGuide() && (
          <div
            className={`${this.props.className} ${styles.guiding} ${directionStyle} ${arrowAlign}`}
          >
            <div className={styles.title_wrapper}>
              <span className={styles.title}> {this.props.title}</span>

              <span className={styles.close} onClick={() => this.stopGuiding()}>
                {i18n.t('guiding.close_tour', 'Close tour')}
              </span>
            </div>

            <span className={styles.description}>
              {' '}
              {this.props.description}
            </span>

            <UnnnicButton
              className={styles.button}
              onClick={() => this.nextGuide()}
              type="primary"
              text={this.props.buttonText}
            />
          </div>
        )}
      </div>
    );
  }
}

/* istanbul ignore next -- @preserve */
const mapStateToProps = ({
  editorState: { currentGuide, guidingStep },
}: AppState) => {
  return {
    currentGuide,
    guidingStep,
  };
};
/* istanbul ignore next -- @preserve */
const mapDispatchToProps = (dispatch: DispatchWithState) =>
  bindActionCreators({ mergeEditorState }, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(GuidingSteps);
