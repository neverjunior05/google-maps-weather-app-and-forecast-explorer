import 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'gmp-basic-place-autocomplete': any;
      'gmp-place-autocomplete': any;
    }
  }
}
