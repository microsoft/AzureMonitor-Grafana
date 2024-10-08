
import { AppRootProps, PluginType } from '@grafana/data';
describe('Components/App', () => {
  let props: AppRootProps;

  beforeEach(() => {
    jest.resetAllMocks();

    props = {
      basename: 'a/sample-app',
      meta: {
        id: 'sample-app',
        name: 'Sample App',
        type: PluginType.app,
        enabled: true,
        jsonData: {},
      },
      query: {},
      path: '',
      onNavChanged: jest.fn(),
    } as unknown as AppRootProps;
  });

  //TODO: fix test
  test('renders without an error"', () => {
    console.log(props);
    // render(
    //   <BrowserRouter>
    //     <App {...props} />
    //   </BrowserRouter>
    // );

    // expect(screen.queryByText(/this is page one./i)).toBeInTheDocument();
  });
});
