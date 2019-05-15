import {loader_mgr} from "../loader/loader_mgr"
import * as utils from "../util"
import { LocalStorage } from "../misc/storage";
import { Consts } from "../../const";

const MUSIC_PATH = "sounds/music/{0}";
const SOUND_PATH = "sounds/sound/{0}";

export class AudioPlayer
{
    private static inst:AudioPlayer;
    private loading_map:Map<string, boolean>;

    private curr_music:string;
    private curr_volume:number;
    private music_id:number;
    private music_volume:number;
    private music_mute:boolean;

    private sound_ids:number[];
    private sound_volume:number;
    private sound_mute:boolean;
    private storage:LocalStorage;

    private constructor()
    {
        this.music_id = -1;
        this.sound_ids = [];
        this.loading_map = new Map();
        this.storage = LocalStorage.getInst();
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
        let sound_vol = this.storage.getFloat(Consts.SoundVol, 1);
        let music_vol = this.storage.getFloat(Consts.MusicVol, 1);
        let is_mute = this.storage.getBool(Consts.SoundMute);
        this.set_music_mute(is_mute);
        this.set_music_volumn(music_vol);
        this.set_sound_mute(is_mute);
        this.set_sound_volumn(sound_vol);
    }

    flush()
    {
        // this.storage.setBool(Consts.SoundMute, this.sound_mute);
    }
    
    //同时只能播放一个
    play_music(name:string, pVolume:number = null)
    {
        if(this.music_id >= 0)
        {
            this.stop_music();
        }

        const path = utils.strfmt(MUSIC_PATH, name);
        this.curr_music = name;
        this.curr_volume = pVolume;

        if(this.music_mute)
        {
            cc.log("music is mute");
            return;
        }
        const volume = pVolume || this.music_volume;
        const task:AudioPlayTask = {type:AudioType.Music, name, path, volume, loop:true};
        this.load_task(task);
    }

    stop_music()
    {
        if(this.music_id < 0)
        {
            cc.log("no music is playing");
            return;
        }
        cc.audioEngine.stop(this.music_id);
        this.music_id = -1;
    }

    get_music_mute()
    {
        return this.music_mute;
    }

    set_music_mute(is_mute:boolean)
    {
        this.music_mute = is_mute;
        if(this.music_id < 0)
        {
            if(!is_mute && this.curr_music)
            {
                const music_id = this.curr_music;
                const volume = this.curr_volume;
                this.curr_music = null;
                this.curr_volume = null;
                this.play_music(music_id, volume);
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
        const path = task.path;
        if(this.loading_map.get(path))
        {
            return;
        }
        this.loading_map.set(path, true);
        if(task.external)
        {
            loader_mgr.get_inst().loadExternalAsset(path, utils.gen_handler(this.on_clip_loaded, this, task));
        }
        else
        {
            loader_mgr.get_inst().loadRes(path, utils.gen_handler(this.on_clip_loaded, this, task));
        }
    }

    private on_clip_loaded(task:AudioPlayTask, clip:cc.AudioClip)
    {
        this.loading_map.delete(task.path);
        if(task.type == AudioType.Music && task.name != this.curr_music)
        {
            return;
        }
        this.play_clip(clip, task.volume, task.loop, task.type, task.cb);
    }

    private play_clip(clip:cc.AudioClip, volume:number, loop:boolean, type:AudioType, cb?:utils.handler)
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
                cb && cb.exec();
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
    play_sound(name:string, loop = false, pVolume:number = null, cb?:utils.handler)
    {
        if(this.sound_mute)
        {
            cc.log("sound is mute");
            return;
        }
        const path = utils.strfmt(SOUND_PATH, name);
        const volume = pVolume || this.sound_volume;
        const task:AudioPlayTask = {type:AudioType.Sound, name, path, volume, loop, cb};
        this.load_task(task);
    }

    play_external_sound(path:string, loop = false, pVolume:number = null, cb?:utils.handler)
    {
        if(this.sound_mute)
        {
            cc.log("sound is mute");
            return;
        }
        const volume = pVolume || this.sound_volume;
        const task:AudioPlayTask = {type:AudioType.Sound, name:path, path, volume, loop, external:true, cb};
        this.load_task(task);
    }

    get_sound_mute()
    {
        return this.sound_mute;
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
        this.stop_music();
        this.loading_map.clear();
        cc.audioEngine.uncacheAll();
    }
}

enum AudioType 
{
    Music = 1,
    Sound = 2,
}

interface AudioPlayTask
{
    type:AudioType;
    name:string;
    path:string;
    volume:number;
    loop:boolean;
    external?:boolean;
    cb?:utils.handler;
}

export const AUDIO_CONFIG = {
    SE_01:"SE_01",
    SE_02:"SE_02",
    SE_03:"SE_03",
}