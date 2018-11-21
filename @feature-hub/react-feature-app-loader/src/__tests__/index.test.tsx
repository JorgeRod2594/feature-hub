import {
  AsyncValue,
  FeatureAppDefinition,
  FeatureAppManagerLike
} from '@feature-hub/feature-app-manager';
import {ReactFeatureAppContainer} from '@feature-hub/react-feature-app-container';
import {shallow} from 'enzyme';
import * as React from 'react';
import {ReactFeatureAppLoader} from '..';

describe('ReactFeatureAppLoader', () => {
  let mockManager: FeatureAppManagerLike;
  let mockGetAsyncFeatureAppDefinition: jest.Mock;
  let mockAsyncFeatureAppDefinition: AsyncValue<FeatureAppDefinition<unknown>>;
  let spyConsoleError: jest.SpyInstance;

  beforeEach(() => {
    if (document.head) {
      document.head.innerHTML = '';
    }

    mockAsyncFeatureAppDefinition = new AsyncValue(new Promise(jest.fn()));

    mockGetAsyncFeatureAppDefinition = jest.fn(
      () => mockAsyncFeatureAppDefinition
    );

    mockManager = {
      getAsyncFeatureAppDefinition: mockGetAsyncFeatureAppDefinition,
      getFeatureAppScope: jest.fn(),
      preloadFeatureApp: jest.fn(),
      destroy: jest.fn()
    };

    spyConsoleError = jest.spyOn(console, 'error');
    spyConsoleError.mockImplementation(jest.fn());
  });

  afterEach(() => {
    spyConsoleError.mockRestore();
  });

  it('initially renders nothing', () => {
    const wrapper = shallow(
      <ReactFeatureAppLoader manager={mockManager} src="" />
    );

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  describe('without a css prop', () => {
    it('does not change the document head', () => {
      shallow(<ReactFeatureAppLoader manager={mockManager} src="/test.js" />);

      expect(document.head).toMatchSnapshot();
    });
  });

  describe('with a css prop', () => {
    it('appends link elements to the document head', () => {
      shallow(
        <ReactFeatureAppLoader
          manager={mockManager}
          src="/test.js"
          css={[{href: 'foo.css'}, {href: 'bar.css', media: 'print'}]}
        />
      );

      expect(document.head).toMatchSnapshot();
    });

    describe('when the css has already been appended', () => {
      it('does not append the css a second time', () => {
        shallow(
          <ReactFeatureAppLoader
            manager={mockManager}
            src="/test.js"
            css={[{href: 'foo.css'}]}
          />
        );

        shallow(
          <ReactFeatureAppLoader
            manager={mockManager}
            src="/test.js"
            css={[{href: 'foo.css'}]}
            featureAppKey="testKey"
          />
        );

        expect(document.head).toMatchSnapshot();
      });
    });
  });

  describe('when a feature app definition is synchronously available', () => {
    let mockFeatureAppDefinition: FeatureAppDefinition<unknown>;

    beforeEach(() => {
      mockFeatureAppDefinition = {
        id: 'test',
        create: jest.fn()
      };

      mockAsyncFeatureAppDefinition = new AsyncValue(
        Promise.resolve(mockFeatureAppDefinition)
      );
    });

    it('renders a FeatureAppContainer', () => {
      const wrapper = shallow(
        <ReactFeatureAppLoader
          manager={mockManager}
          src="/test.js"
          featureAppKey="testKey"
        />
      );

      expect(wrapper.getElement()).toEqual(
        <ReactFeatureAppContainer
          manager={mockManager}
          featureAppDefinition={mockFeatureAppDefinition}
          featureAppKey="testKey"
        />
      );
    });
  });

  describe('when the async feature app definition synchronously has an error', () => {
    let mockError: Error;

    beforeEach(() => {
      mockError = new Error('Failed to load feature app module.');

      mockAsyncFeatureAppDefinition = new AsyncValue(
        Promise.reject(mockError),
        undefined,
        mockError
      );
    });

    it('renders nothing and logs an error', () => {
      const wrapper = shallow(
        <ReactFeatureAppLoader
          manager={mockManager}
          src="/test.js"
          featureAppKey="testKey"
        />
      );

      expect(wrapper.isEmptyRender()).toBe(true);

      expect(spyConsoleError.mock.calls).toEqual([
        [
          'The feature app for the url "/test.js" and the key "testKey" could not be loaded.',
          mockError
        ]
      ]);
    });
  });

  describe('when a feature app definition is loaded asynchronously', () => {
    let mockFeatureAppDefinition: FeatureAppDefinition<unknown>;

    beforeEach(() => {
      mockFeatureAppDefinition = {
        id: 'test',
        create: jest.fn()
      };

      mockAsyncFeatureAppDefinition = new AsyncValue(
        new Promise(resolve =>
          // defer to next event loop turn to guarantee asynchronism
          setImmediate(() => resolve(mockFeatureAppDefinition))
        )
      );
    });

    it('initially renders nothing', () => {
      const wrapper = shallow(
        <ReactFeatureAppLoader manager={mockManager} src="/test.js" />
      );

      expect(wrapper.isEmptyRender()).toBe(true);
    });

    it('renders a FeatureAppContainer when loaded', async () => {
      const wrapper = shallow(
        <ReactFeatureAppLoader
          manager={mockManager}
          src="/test.js"
          featureAppKey="testKey"
        />
      );

      await mockAsyncFeatureAppDefinition.promise;

      expect(wrapper.getElement()).toEqual(
        <ReactFeatureAppContainer
          manager={mockManager}
          featureAppDefinition={mockFeatureAppDefinition}
          featureAppKey="testKey"
        />
      );
    });

    describe('when unmounted before loading has finished', () => {
      it('renders nothing', async () => {
        const wrapper = shallow(
          <ReactFeatureAppLoader
            manager={mockManager}
            src="/test.js"
            featureAppKey="testKey"
          />
        );

        wrapper.unmount();

        await mockAsyncFeatureAppDefinition.promise;

        expect(wrapper.isEmptyRender()).toBe(true);
      });
    });
  });

  describe('when a feature app definition fails to load asynchronously', () => {
    let mockError: Error;

    beforeEach(() => {
      mockError = new Error('Failed to load feature app module.');

      mockAsyncFeatureAppDefinition = new AsyncValue(
        new Promise((_, reject) =>
          // defer to next event loop turn to guarantee asynchronism
          setImmediate(() => reject(mockError))
        )
      );
    });

    it('renders nothing and logs an error', async () => {
      const wrapper = shallow(
        <ReactFeatureAppLoader
          manager={mockManager}
          src="/test.js"
          featureAppKey="testKey"
        />
      );

      expect.assertions(3);

      try {
        await mockAsyncFeatureAppDefinition.promise;
      } catch (error) {
        expect(error).toBe(mockError);
      }

      expect(wrapper.isEmptyRender()).toBe(true);

      expect(spyConsoleError.mock.calls).toEqual([
        [
          'The feature app for the url "/test.js" and the key "testKey" could not be loaded.',
          mockError
        ]
      ]);
    });

    describe('when unmounted before loading has finished', () => {
      it('logs an error', async () => {
        const wrapper = shallow(
          <ReactFeatureAppLoader
            manager={mockManager}
            src="/test.js"
            featureAppKey="testKey"
          />
        );

        wrapper.unmount();

        expect.assertions(2);

        try {
          await mockAsyncFeatureAppDefinition.promise;
        } catch (error) {
          expect(error).toBe(mockError);
        }

        expect(spyConsoleError.mock.calls).toEqual([
          [
            'The feature app for the url "/test.js" and the key "testKey" could not be loaded.',
            mockError
          ]
        ]);
      });
    });
  });
});
