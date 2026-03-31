import React from 'react';
import { DownIconProps } from './DownIcon';

export class UpIcon extends React.PureComponent<DownIconProps> {
  render() {
    return (
      <svg
        width="20"
        height="21"
        viewBox="0 0 20 21"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g id="expand_less">
          <mask
            id="mask0_4498_1608"
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="20"
            height="21"
          >
            <rect
              id="Bounding box"
              y="0.5"
              width="20"
              height="20"
              fill="#D9D9D9"
            />
          </mask>
          <g mask="url(#mask0_4498_1608)">
            <path
              id="expand_less_2"
              d="M9.99991 9.28193L6.43899 12.8428C6.32362 12.9582 6.19595 13.0173 6.05599 13.0199C5.91605 13.0226 5.78571 12.9636 5.66499 12.8428C5.54426 12.7221 5.48389 12.5931 5.48389 12.4558C5.48389 12.3186 5.5466 12.1872 5.67203 12.0618L9.53518 8.19864C9.60483 8.13454 9.67807 8.08647 9.75489 8.05441C9.83169 8.02237 9.91476 8.00635 10.0041 8.00635C10.0934 8.00635 10.1765 8.02237 10.2533 8.05441C10.3301 8.08647 10.4005 8.13454 10.4646 8.19864L14.3278 12.0618C14.4479 12.1819 14.5092 12.3084 14.5119 12.4414C14.5146 12.5744 14.4556 12.7013 14.3348 12.822C14.2141 12.9427 14.0851 13.0031 13.9478 13.0031C13.8105 13.0031 13.6815 12.9427 13.5608 12.822L9.99991 9.28193Z"
              fill={this.props.disabled ? '#D0D3D9' : '#1C1B1F'}
            />
          </g>
        </g>
      </svg>
    );
  }
}
