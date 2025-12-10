import { useState, useEffect } from 'react';
import NetworkManager from '../utils/NetworkManager';

export const useNetworkConnection = () => {
    const [isConnected, setIsConnected] = useState(NetworkManager.getConnectionStatus());
    const [isChecking, setIsChecking] = useState(true);
    const [isRetrying, setIsRetrying] = useState(false);

    useEffect(() => {
        // Initial network check
        const checkInitialNetwork = async () => {
            try {
                const connected = await NetworkManager.checkConnection();
                setIsConnected(connected);
            } catch (error) {
                console.log('❌ useNetworkConnection: Initial check error:', error);
                setIsConnected(false);
            } finally {
                setIsChecking(false);
            }
        };

        checkInitialNetwork();

        // Listen for network changes
        const networkListener = (connected, wasConnected) => {
            console.log('🔄 Network status changed in hook:', { connected, wasConnected });
            setIsConnected(connected);
            
            // Reset retrying state when connected
            if (connected) {
                setIsRetrying(false);
            }
        };

        NetworkManager.addListener(networkListener);

        // Cleanup
        return () => {
            NetworkManager.removeListener(networkListener);
        };
    }, []);

    const checkConnection = async () => {
        setIsChecking(true);
        try {
            const connected = await NetworkManager.checkConnection();
            setIsConnected(connected);
            return connected;
        } catch (error) {
            console.log('❌ useNetworkConnection: Check error:', error);
            setIsConnected(false);
            return false;
        } finally {
            setIsChecking(false);
        }
    };

    const retryConnection = async () => {
        setIsRetrying(true);
        console.log('🔄 Manual retry requested...');
        
        try {
            const success = await NetworkManager.retryConnection();
            console.log('🔄 Retry result:', success);
            
            if (!success) {
                // If manual retry fails, wait a bit and check again
                setTimeout(async () => {
                    const currentStatus = await NetworkManager.checkConnection();
                    setIsConnected(currentStatus);
                    setIsRetrying(false);
                }, 1000);
            }
        } catch (error) {
            console.log('❌ Retry error:', error);
            setIsRetrying(false);
        }
    };

    const waitForConnection = async (timeout = 30000) => {
        try {
            await NetworkManager.waitForConnection(timeout);
            return true;
        } catch (error) {
            console.log('❌ useNetworkConnection: Wait timeout:', error);
            return false;
        }
    };

    return {
        isConnected,
        isChecking,
        isRetrying,
        checkConnection,
        retryConnection,
        waitForConnection,
    };
};

export default useNetworkConnection;
