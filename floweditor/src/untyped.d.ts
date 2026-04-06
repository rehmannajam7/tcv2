declare module 'classnames/bind';
declare module 'http-proxy-middleware';
declare module 'http-headers-validation';
declare module 'external';

declare namespace JSX {
  interface IntrinsicElements {
    'temba-textinput': any;
    'temba-completion': any;
    'temba-select': any;
    'temba-option': any;
    'temba-checkbox': any;
    'temba-charcount': any;
  }
}

// CSS/SCSS module typings for TypeScript
declare module '*.module.scss' {
  const classes: Record<string, string>;
  export default classes;
}

declare module '*.module.sass' {
  const classes: Record<string, string>;
  export default classes;
}

declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}

// Fallback declarations for non-module styles
declare module '*.scss' {
  const content: any;
  export default content;
}

declare module '*.sass' {
  const content: any;
  export default content;
}

declare module '*.css' {
  const content: any;
  export default content;
}
