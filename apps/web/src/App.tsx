import { useState } from 'react';
import { RouterProvider } from 'react-router/dom';

import { AppProviders } from './AppProviders';
import { createAppRouter } from './router';

export const App = () => {
  const [router] = useState(createAppRouter);

  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
};
