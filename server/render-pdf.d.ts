// Type declarations for PDF rendering in the server context
import { Document } from '@react-pdf/renderer';
import { ReactElement } from 'react';

// Override createElement's return type when creating PDF documents
declare module 'react' {
  interface ReactElementCreator {
    (type: typeof Document, props?: any, ...children: any[]): ReactElement<any, any>;
  }
}

// Declare the renderToBuffer function for PDF generation
declare function renderToBuffer(element: ReactElement): Promise<Buffer>;