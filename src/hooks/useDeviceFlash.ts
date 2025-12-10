import { useEffect, useRef, useState } from 'react';

// Hook để điều khiển đèn flash thật trên device
export const useDeviceFlash = (isFlashing: boolean, enabled: boolean = true) => {
  const flashIntervalRef = useRef<any>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);

  // Kiểm tra torch availability khi hook mount
  useEffect(() => {
    const checkTorchAvailability = async () => {
      try {
        const Torch = require('react-native-torch');
        
        // Kiểm tra xem module có được load đúng không
        if (Torch && Torch.default) {
          setTorchAvailable(true);
          console.log('Torch module available');
        } else {
          console.log('Torch module not available');
          setTorchAvailable(false);
        }
      } catch (error) {
        console.log('Torch module check failed:', error);
        setTorchAvailable(false);
      }
    };

    checkTorchAvailability();
  }, []);

  useEffect(() => {
    if (!torchAvailable || !enabled) {
      return;
    }

    if (isFlashing) {
      // Bật flash device với toggle pattern
      flashIntervalRef.current = setInterval(() => {
        try {
          const Torch = require('react-native-torch');
          
          if (Torch && Torch.default && typeof Torch.default.switchState === 'function') {
            setTorchOn(prev => {
              const newState = !prev;
              
              // Gọi switchState một cách an toàn
              Promise.resolve(Torch.default.switchState(newState))
                .catch(err => {
                  console.log('Torch switchState error:', err);
                });
              
              return newState;
            });
          }
        } catch (error) {
          console.log('Torch toggle failed:', error);
        }
      }, 120);
    } else {
      // Dừng flash và tắt đèn
      if (flashIntervalRef.current) {
        clearInterval(flashIntervalRef.current);
        flashIntervalRef.current = null;
      }
      
      if (torchOn) {
        try {
          const Torch = require('react-native-torch');
          if (Torch && Torch.default && typeof Torch.default.switchState === 'function') {
            Promise.resolve(Torch.default.switchState(false))
              .catch(err => {
                console.log('Torch turn off error:', err);
              });
            setTorchOn(false);
          }
        } catch (error) {
          console.log('Torch turn off failed:', error);
        }
      }
    }

    return () => {
      if (flashIntervalRef.current) {
        clearInterval(flashIntervalRef.current);
        flashIntervalRef.current = null;
      }
      
      // Tắt đèn khi component unmount
      if (torchAvailable && torchOn) {
        try {
          const Torch = require('react-native-torch');
          if (Torch && Torch.default && typeof Torch.default.switchState === 'function') {
            Promise.resolve(Torch.default.switchState(false))
              .catch(err => {
                console.log('Torch cleanup error:', err);
              });
            setTorchOn(false);
          }
        } catch (error) {
          console.log('Torch cleanup failed:', error);
        }
      }
    };
  }, [isFlashing, enabled, torchAvailable, torchOn]);
};