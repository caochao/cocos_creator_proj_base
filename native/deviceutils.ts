export const DeviceUtils = {
    setKeepScreenOn(value:boolean) {
        jsb.Device.setKeepScreenOn(value);
    },

    vibrate(duration:number = 0.01) {
        jsb.Device.vibrate(duration);
    }
};