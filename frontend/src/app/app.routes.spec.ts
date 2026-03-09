import { routes } from './app.routes';

describe('app routes', () => {
  it('includes the public entry and admin sections', () => {
    const paths = routes.map((route) => route.path);
    expect(paths).toContain('public');
    expect(paths).toContain('admin');
    expect(paths).toContain('structure-admin');
    expect(paths).toContain('super-admin');
  });

  it('redirects root to public home', () => {
    const root = routes.find((route) => route.path === '');
    expect(root?.redirectTo).toBe('public/home');
  });
});
