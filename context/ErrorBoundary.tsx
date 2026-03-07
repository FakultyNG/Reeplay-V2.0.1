import React, { ReactNode, useCallback } from 'react';
import ErrorBoundary from 'react-native-error-boundary';
import crashlytics from '@react-native-firebase/crashlytics';
import { Text, View } from 'react-native';

import { AppButton } from '@/components';
import Size from '@/Utils/useResponsiveSize';
import colors from '@/configs/colors';

interface ErrorBoundaryWrapperProps {
    children: ReactNode;
}

interface FallbackProps {
    error: Error;
    resetError: () => void;
}

/**
 * Logs non-fatal React render errors to Firebase Crashlytics.
 * These errors do NOT crash the app but indicate broken UI states.
 */
const logErrorToCrashlytics = (error: Error, stackTrace?: string) => {
    crashlytics().recordError(error);

    if (stackTrace) {
        crashlytics().log(stackTrace);
    }

    crashlytics().setAttributes({
        error_source: 'react_error_boundary',
        is_fatal: 'false',
    });
};

const CustomFallback = ({ error, resetError }: FallbackProps) => (
    <View
        style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
        }}
        className="bg-white w-full h-full">
        <Text
            children={`Oops! \nSomething went wrong 😔`}
            className="font-INTER_600 text-center text-inputBlack text-xl"
        />
        <Text
            children={`Error: ${error.message}`}
            className="font-INTER_400 mt-6 text-inputBlack"
        />

        <AppButton
            bgColor={colors.GREY_600}
            onPress={resetError}
            style={{
                width: Size.calcHeight(85),
                borderRadius: 4,
                borderTopRightRadius: 0,
                borderBottomRightRadius: 0,
                marginRight: 2,
                paddingVertical: 17.5,
            }}
            title="Try Again"
        />

    </View>
);

const ErrorBoundaryWrapper = ({ children }: ErrorBoundaryWrapperProps) => {
    const errorHandler = useCallback((error: Error, stackTrace: string) => {
        console.log('🔥 Caught by React Error Boundary:', error);
        logErrorToCrashlytics(error, stackTrace);
    }, []);

    return (
        // @ts-ignore
        <ErrorBoundary FallbackComponent={CustomFallback} onError={errorHandler}>
            {children}
        </ErrorBoundary>
    );
};

export default ErrorBoundaryWrapper;
