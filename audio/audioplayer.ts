import {loader_mgr} from "../loader/loader_mgr"
import {gen_handler, handler, localStorage} from "../utils"
import * as format from "../../3rd/sprintfjs/format"
import * as consts from "../../consts"

const MUSIC_PATH = "sounds/music/%s";
const SOUND_PATH = "sounds/sound/%s";

export class AudioPlayer
{
    private static inst:AudioPlayer;
    private clip_cache:Map<string, cc.AudioClip>;
    private loading_map:Map<string, boolean>;

    private curr_music:string;
    private music_id:number;
    private music_volume:number;
    private music_mute:boolean;

    private sound_ids:number[];
    private sound_volume:number;
    private sound_mute:boolean;

    private constructor()
    {
        this.music_id = -1;
        this.sound_ids = [];
        this.clip_cache = new Map();
        this.loading_map = new Map();
    }

    static getInst()
    {
        if(!this.inst)
        {
            this.inst = new AudioPlayer();
        }
        return this.inst;
    }

    init()
    {
        let sound_vol_str = localStorage.get(consts.MISC.SOUND_VOL);
        let music_vol_str = localStorage.get(consts.MISC.MUSIC_VOL);
        let sound_vol = sound_vol_str ? parseFloat(sound_vol_str) : 1;
        let music_vol = music_vol_str ? parseFloat(music_vol_str) : 1;        
        let mute_str = localStorage.get(consts.MISC.SOUND_MUTE);
        let mute_int = mute_str ? parseInt(mute_str) : 0;
        let is_mute = mute_int == 1;
        this.set_music_mute(is_mute);
        this.set_music_volumn(music_vol);
        this.set_sound_mute(is_mute);
        this.set_sound_volumn(sound_vol);
    }
    
    //同时只能播放一个
    play_music(name:string)
    {
        if(this.music_id >= 0)
        {
            this.stop_music();
        }

        let path = format.sprintf(MUSIC_PATH, name);
        this.curr_music = name;

        if(this.music_mute)
        {
            cc.info("music is mute");
            return;
        }
        let clip = this.clip_cache.get(path);
        if(clip)
        {
            this.play_clip(clip, this.music_volume, true, AudioType.Music);
        }
        else
        {
            let task:AudioPlayTask = {type:AudioType.Music, name:name, path:path, volume:this.music_volume, loop:true};
            this.load_task(task);
        }
    }

    stop_music()
    {
        if(this.music_id < 0)
        {
            cc.info("no music is playing");
            return;
        }
        cc.audioEngine.stop(this.music_id);
        this.music_id = -1;
    }

    set_music_mute(is_mute:boolean)
    {
        this.music_mute = is_mute;
        if(this.music_id < 0)
        {
            if(!is_mute && this.curr_music)
            {
                this.play_music(this.curr_music);
            }
            return;
        }
        if(is_mute)
        {
            cc.audioEngine.pause(this.music_id);
        }
        else
        {
            cc.audioEngine.resume(this.music_id);
        }
    }

    //0~1
    set_music_volumn(volume:number)
    {
        this.music_volume = volume;
        if(this.music_id >= 0)
        {
            cc.audioEngine.setVolume(this.music_id, volume);
        }
    }

    private load_task(task:AudioPlayTask)
    {
        let path = task.path;
        if(this.loading_map.get(path))
        {
            return;
        }
        this.loading_map.set(path, true);
        loader_mgr.get_inst().loadRawAsset(path, gen_handler(this.on_clip_loaded, this, task));
    }

    private on_clip_loaded(task:AudioPlayTask, clip:cc.AudioClip)
    {
        this.clip_cache.set(task.path, clip);
        if(task.type == AudioType.Music && task.name != this.curr_music)
        {
            return;
        }
        this.play_clip(clip, task.volume, task.loop, task.type);
    }

    private play_clip(clip:cc.AudioClip, volume:number, loop:boolean, type:AudioType)
    {
        let aid = cc.audioEngine.play(clip, loop, volume);
        if(type == AudioType.Music)
        {
            this.music_id = aid;
        }
        else if(type == AudioType.Sound)
        {
            this.sound_ids.push(aid);
            cc.audioEngine.setFinishCallback(aid, () => {
                this.on_sound_finished(aid);
            });
        }
    }

    private on_sound_finished(aid:number)
    {
        let idx = this.sound_ids.findIndex((id) => {
            return id == aid;
        });
        if(idx != -1)
        {
            this.sound_ids.splice(idx, 1);
        }
    }

    //可同时播放多个
    play_sound(name:string)
    {
        if(this.sound_mute)
        {
            cc.info("sound is mute");
            return;
        }
        let path = format.sprintf(SOUND_PATH, name);
        let clip = this.clip_cache.get(path);
        if(clip)
        {
            this.play_clip(clip, this.sound_volume, false, AudioType.Sound);
        }
        else
        {
            let task:AudioPlayTask = {type:AudioType.Sound, name:name, path:path, volume:this.sound_volume, loop:false};
            this.load_task(task);
        }
    }

    set_sound_mute(is_mute:boolean)
    {
        this.sound_mute = is_mute;
        this.sound_ids.forEach((sid) => {
            if(is_mute)
            {
                cc.audioEngine.pause(sid);
            }
            else
            {
                cc.audioEngine.resume(sid);
            }
        });
    }

    //0~1
    set_sound_volumn(volume:number)
    {
        this.sound_volume = volume;
        this.sound_ids.forEach((sid) => {
            cc.audioEngine.setVolume(sid, volume);
        });
    }

    stop_sound()
    {
        this.sound_ids.forEach((sid) => {
            cc.audioEngine.stop(sid);
        });
        this.sound_ids.length = 0;
    }

    clear_cache()
    {
        this.clip_cache.forEach((clip, key) => {
            loader_mgr.get_inst().release(clip);
        });
        this.clip_cache.clear();
        this.loading_map.clear();
        cc.audioEngine.uncacheAll();
    }
}

enum AudioType 
{
    Music = 1,
    Sound = 2,
}

type AudioPlayTask = {
    type:AudioType;
    name:string;
    path:string;
    volume:number;
    loop:boolean;
}

export const AUDIO_CONFIG = {
    MAIN_BG_MUSIC:"dz_hall_background_music",
    SGCARD_BG_MUSIC:"background",
    BUTTON_CLICK:"button_click_sound",
    SSC_BG_MUSIC:"fruit_bg",
    SSC_OPEN_NOTIFY:"start",
    LHC_BG_MUSIC:"fruit_bg",
    LHC_OPEN_NOTIFY:"start",
}