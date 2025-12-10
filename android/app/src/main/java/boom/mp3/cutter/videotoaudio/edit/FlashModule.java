package boom.mp3.cutter.videotoaudio.edit;

import android.content.Context;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraManager;
import android.hardware.camera2.CameraCharacteristics;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

public class FlashModule extends ReactContextBaseJavaModule {
    private CameraManager cameraManager;
    private String cameraId;
    private boolean hasFlash = false;
    
    public FlashModule(ReactApplicationContext reactContext) {
        super(reactContext);
        cameraManager = (CameraManager) reactContext.getSystemService(Context.CAMERA_SERVICE);
        initializeCamera();
    }

    private void initializeCamera() {
        try {
            if (cameraManager != null) {
                String[] cameraIdList = cameraManager.getCameraIdList();
                for (String id : cameraIdList) {
                    CameraCharacteristics characteristics = cameraManager.getCameraCharacteristics(id);
                    Boolean flashAvailable = characteristics.get(CameraCharacteristics.FLASH_INFO_AVAILABLE);
                    if (flashAvailable != null && flashAvailable) {
                        cameraId = id;
                        hasFlash = true;
                        break;
                    }
                }
            }
        } catch (CameraAccessException e) {
            e.printStackTrace();
        }
    }

    @Override
    public String getName() {
        return "FlashModule";
    }

    @ReactMethod
    public void switchFlash(boolean flashOn, Promise promise) {
        try {
            if (!hasFlash) {
                promise.reject("FLASH_ERROR", "Device does not have flash capability");
                return;
            }
            
            if (cameraManager != null && cameraId != null) {
                cameraManager.setTorchMode(cameraId, flashOn);
                promise.resolve("Flash " + (flashOn ? "ON" : "OFF"));
            } else {
                promise.reject("FLASH_ERROR", "Camera not available");
            }
        } catch (CameraAccessException e) {
            promise.reject("FLASH_ERROR", "Camera access error: " + e.getMessage());
        } catch (Exception e) {
            promise.reject("FLASH_ERROR", "Flash error: " + e.getMessage());
        }
    }

    @ReactMethod
    public void hasFlashlight(Promise promise) {
        promise.resolve(hasFlash);
    }
}
