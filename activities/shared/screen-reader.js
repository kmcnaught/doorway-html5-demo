// Screen reader for Doorway Online Javascript-based web pages.
// by Roger Spooner for Doorway Accessible Software Trust
// 1 July 2018

export class DoorwayScreenReader
{
  constructor(consumer, i18n)
  {
    this.doorwayConsumer = consumer;
    if (!i18n || typeof i18n.getText !== 'function')
    {
      throw "i18n object with getText() method expected in DoorwayScreenReader constructor";
    }
    this.i18n = i18n;
    this.screenReaderEnabled = false;
    // See this.doorwayConsumer.options.enable_audio
    this.waitingPromiseResolvers = [];
        this.isPlayingAudio = false;
        this.audioQueue = [];
    this.pendingVoiceName = [];
    this.lastLogTime = Date.now();
    this.debug = false;
    this.isInit = false;
    this.nowPlaying = {voice:"finished",speech:"just initialised"};
    this.ttsSynth = window.speechSynthesis;
    this.voiceList = [];
    if (this.ttsSynth)
    {   if (this.ttsSynth.addEventListener)
        this.ttsSynth.addEventListener("voiceschanged",this.onVoicesChanged.bind(this));
      this.voiceList = this.ttsSynth.getVoices();
      if (this.voiceList.length > 0)
        this.isInit = true;
    }
  }
  
  async cancelTtsSpeech() // function cancelSpeech in class
  { // This is an internal function for TTS. Please use interruptAudio().
    if (this.debug) console.log("cancelTtsSpeech()"+
      ". speaking=" + this.ttsSynth.speaking + 
      ", pending="+this.ttsSynth.pending +
      ", paused="+this.ttsSynth.paused +
      ", time="+this.incLogTime()  );
    if (this.ttsSynth.speaking || this.ttsSynth.pending)
    { this.nowPlaying.voice="cancel-tts";
      setTimeout(this.tidyUpCancelledTts.bind(this), 100);
    }
    this.ttsSynth.cancel();
    // TODO if recorded audio is playing, we should pause it
    // this.onEndUtterance(null);
    // await promiseDelay(100);
    this.waitingPromiseResolvers = [];
  }
  
  tidyUpCancelledTts()
  { // Google Chrome sends an utterance 'end' event after cancellation, 
    // while also reporting that it is neither speaking, nor pending
    // Firefox doesn't send an 'end' event after cancellation.
    // see #212
    if (this.debug) console.log("tidyUpCancelledTts()"+
      ", time="+this.incLogTime() +
      ". speaking=" + this.ttsSynth.speaking + 
      ", pending="+this.ttsSynth.pending +
      ", paused="+this.ttsSynth.paused +
      ", nowPlaying.voice = "+this.nowPlaying.voice );
    if (this.nowPlaying.voice == 'cancel-tts' && !this.isSpeaking())
    {
      this.nowPlaying.voice="finished";
      this.finishedAudio( { voice:"tidyUpCancelledTts",text:"unknown" } );
    }
  }
  
  onPageEvent(evt) // function onPageEvent in class
  {
    if (evt.type == "ended")
            this.finishedAudio(target);
            // audio playback, not necessarily related to screen reader.
    if ( ! this.screenReaderEnabled)
      return false;
    if ( ! this.doorwayConsumer.options.enable_audio)
      return false;
    if (this.debug)
      console.log("onPageEvent "+evt.type+" on id "+ evt.target.id);
    var alt, label, title, inputType;
    var target = evt.target;
    var text = target.textContent;
        if (!(target.classList.contains("no_speak_form")))    
      switch (evt.type)
      {
        case "change":
            case "mouseover":
            case "focusin":
                switch (target.tagName)
                {
                case "INPUT":
                    label = target.labels[0];
                    title = target.getAttribute("title");
                    alt = target.getAttribute("alt");
          inputType = target.getAttribute("type");
          if (inputType) inputType = inputType.toUpperCase();
                    if (label)
                    { text = label.textContent;
                      alt = label.getAttribute("alt");
                    }
                    if (alt && alt.length > 0)
                      text = alt;
          var checkedAnswer;
          if (target.checked)
            checkedAnswer = this.i18n.getText("screenreader.checkbox.checked");
          else
            checkedAnswer = this.i18n.getText("screenreader.checkbox.unchecked");
          if (this.debug)
            console.info("Screen reader "+evt.type+" "+target.id+" : "+checkedAnswer);
          switch (inputType)
          {
            case "CHECKBOX":
              if (title)
              text = this.i18n.getText("screenreader.input.checkbox", {"label": title, "checked": checkedAnswer});
              else
              text = this.i18n.getText("screenreader.input.checkbox", {"label": label.textContent, "checked": checkedAnswer});
              break;
            case "RADIO":
              if (title)
              text = this.i18n.getText("screenreader.input.radio", {"label": title, "checked": checkedAnswer});
              else
              text = this.i18n.getText("screenreader.input.radio", {"label": label.textContent, "checked": checkedAnswer});
              break;
            default:
              if (title)
              text = this.i18n.getText("screenreader.input", {"label": title});
              else
              text = this.i18n.getText("screenreader.input", {"label": label.textContent});
          }
          this.addAudioToQueue(text, "screenreader", true, false);
                    break;
                case "BUTTON":
                    title = target.getAttribute("title");
                    if (title && title.length > 0)
                          text = title;
                        this.addAudioToQueue(text, "screenreader", true, false);
                        break;
                case "LABEL":
                        text = target.textContent;
                        alt = target.getAttribute("alt");
                        if (alt && alt.length > 0)
                          text = alt;
                        this.addAudioToQueue(text, "screenreader", true, false);
                        break;
                case "A":
                    title = target.getAttribute("title");
                    if (title && title.length > 0)
                          text = title;
                        this.addAudioToQueue(text, "screenreader", true, false);
                        break;
        case "SELECT":
          if (target.selectedIndex >= 0)
          { text = target.options[target.selectedIndex].textContent;    //assuming exactly one item is selected
            this.addAudioToQueue(text, "screenreader", true, false);
          }
          break;
        case "FIELDSET": {
          let legend = target.getElementsByTagName("LEGEND")[0];
                    title = target.getAttribute("title");
                    if (title && title.length > 0)
                          text = title;
          if (legend)
            text = legend.textContent;
                    this.addAudioToQueue(text, "screenreader", true, false);
                    break;
        }
        case "P":
        case "H1":
        case "H2":
        case "H3":
        case "H4":
        case "H5":
        case "H6":
          if (target.textContent.length > 0)
            text = target.textContent;
          this.addAudioToQueue(text, "screenreader", true, false);
          break;
                }
                break;
    }
    return false;
  }
  
  enable(on) // function enable in class
  {
    this.screenReaderEnabled = on;
    if (!on) this.cancelTtsSpeech(); // Bug #335
    if (!this.isInit) 
      return false;
    if (this.ttsSynth ) 
      return true;
    return false;
  }
  
  isScreenReaderEnabled()
  {
    return this.screenReaderEnabled;
  }
  
  monitorElement(readableName) // function addEventListener in class
  {
    var readable = document.getElementById(readableName);
    if (readable == null) 
    {   console.error("can't initialise doorwayScreenReader on "+readableName); 
      return null; 
    }
    readable.addEventListener("focusin", this.onPageEvent.bind(this));
    readable.addEventListener("change", this.onPageEvent.bind(this));
    readable.addEventListener("blur", this.onPageEvent.bind(this));
    readable.addEventListener("mouseover", this.onPageEvent.bind(this));
    }

    monitorAudioElement(readable) // function addEventListener in class
    {
    if (readable == null)
    {  console.error("monitorAudioElement( undefined readable )");
      return;
    }
        readable.addEventListener("ended", this.onPageEvent.bind(this));
    }
  
  isSpeaking()
  {
    return this.isPlayingAudio | this.ttsSynth.pending | this.ttsSynth.speaking | this.nowPlaying.voice == "cancel-tts";
  }
  
  onUtteranceEvent(utterance,evt) // function onEndUtterance in class
  {
    if (this.debug) console.info("onUtteranceEvent "+evt+" : '"+utterance.text+"' time="+this.incLogTime());
    if (evt == 'start')
    {
      if (this.nowPlaying.voice == "pending-tts")
      {
        this.nowPlaying = this.nowPlaying.queueItem;
      }
      return;
    }
    // Event was terminal, e.g. "end"
    if (this.nowPlaying.utterance && (utterance != this.nowPlaying.utterance))
    {
      let ut = "undef";
      let npt = "undef";
      if (utterance) ut = utterance.text;
      if (this.nowPlaying.utterance) npt = this.nowPlaying.utterance.text;
      console.info("Mismatched onEndUtterance. Actually ended '"+ut +
        "', but thought we were nowPlaying '"+npt+"' as "+this.nowPlaying.voice);
    }
    this.nowPlaying.voice = "finished";
    this.finishedAudio(utterance);
    for (var resolver of this.waitingPromiseResolvers)
      resolver(true);
    this.waitingPromiseResolvers = [];
  }


    failedAudio(audioElem,err) // function failedAudio in class
    {
        console.warn("failedAudio "+audioElem.id+" t="+this.incLogTime()+" err="+err.toString());
        this.finishedAudio(audioElem);
    }

    playAudio(newAudio)
    {
    if (this.debug)  
      console.log("playAudio "+JSON.stringify(newAudio) +", isSpeaking() = "+this.isSpeaking()+", time="+this.incLogTime()+" queue="+ JSON.stringify(this.audioQueue));
        if (newAudio.voice == "recorded")
        {
            try
            {
        newAudio.speech.currentTime = 0; // might have been paused
                newAudio.speech.play().catch(this.failedAudio.bind(this,newAudio));
                this.isPlayingAudio = true;
        this.nowPlaying = newAudio;
            }
            catch (err)
            {
                console.error("Cannot play audio" + err.toString());
                console.error(err);
                console.error(newAudio.speech);
                this.finishedAudio(newAudio); // move to next item in queue. End audio event will not arrive
            }
        }
        else if (newAudio.voice == "screenreader") // play screenreader audio
        {
      if (!this.isInit)
      {
        if (this.debug)
          console.warn("Not speaking '"+newAudio.speech + 
            "' because not isScreenReaderEnabled or not isInit");
        return false;
      }
      try
      {
        if (this.doorwayConsumer.options.enable_audio === false)
          return false; // didn't speak
          // If this DoorwayScreenReader is not in Text Type, 
          // the options might not coincide.
        var text=newAudio.speech;
        var utterThis = new SpeechSynthesisUtterance(text);
        utterThis.addEventListener("end", this.onUtteranceEvent.bind(this, utterThis,"end"));
        utterThis.addEventListener("error", this.onUtteranceEvent.bind(this, utterThis,"error"));
        utterThis.addEventListener("start", this.onUtteranceEvent.bind(this, utterThis,"start"));
        this.isPlayingAudio = true;
        this.nowPlaying = { voice:"pending-tts", queueItem:newAudio, utterance:utterThis };
        if (this.debug)
          console.log("tts.speak("+utterThis.text+")");
        if (newAudio.negativeVoice)
          utterThis.voice = this.ttsVoiceNegative;
        else
          utterThis.voice = this.ttsVoicePositive;
        if (this.debug)
        { console.log("speech utterance voice");
          console.log(utterThis.voice);
        }
        this.ttsSynth.speak(utterThis);
      }
      catch (err)
      {
        console.error("Cannot playAudio("+String(newAudio.speech)+"): "+String(err));
        return false;
      }
        }
    return true;
    }

    addAudioToQueue(audioElem, audioVoice, audioInterrupt, isNegative) // function addAudioToQueue in class
    {
        // audioElem is either an HTML element containing audio which can be played or a string to be spoken by TTS
        // audioVoice must be either "recorded" or "screenreader"
        // audioInterrupt is a boolean value. True = clear the queue and stop any current playback
    if (this.debug)
      console.log("addAudioToQueue "+audioElem);
        var audioItem =
      {   'voice':audioVoice, 
        'speech':audioElem, 
        'interrupt':audioInterrupt, 
        'negativeVoice':isNegative
      };
    if (audioElem == undefined)
    { console.error("addAudioToQueue: audioElem is undefined");
      return;
    }
    if (audioVoice == 'screenreader' && audioElem=='')
    {
      console.error("addAudioToQueue of empty tts.");
      return;
    }
    if (this.doorwayConsumer.options.enable_audio == false)
    {
      // console.info("addAudioToQueue() ignoring because not options.enable_audio");
      return;
    }
    audioItem.elemId = '---';
    if (audioVoice == 'recorded' && audioElem != undefined)
      audioItem.elemId = audioElem.id;
        if (!this.isSpeaking()) // queue is empty and this is the first to be added
        {
            if (this.audioQueue.length > 1)
            {
                console.error("isPlayingAudio = false but audioQueue "+this.audioQueue.length+" = ");
                console.error(this.audioQueue);
            }
      if (this.debug)
        console.log("Added audio " + JSON.stringify(audioItem) +
        ", isSpeaking = "+this.isSpeaking() + 
        ", nowPlaying="+JSON.stringify(this.nowPlaying) + 
        ", time="+this.incLogTime() + 
        ", empty queue was "+this.audioQueueToString() +
        ", isSpeaking()="+this.isSpeaking() + 
        ". tts.speaking=" + this.ttsSynth.speaking + 
        ", tts.pending="+this.ttsSynth.pending +
        ", tts.paused="+this.ttsSynth.paused );
      this.audioQueue.push(audioItem);
            this.finishedAudio( { voice:"addAudioToQueue",text:"unknown"} ); // #212 dangerous. but not currently isPlayingAudio.
        }
        else // queue is currently playing audio
        {
            if (audioInterrupt)
              this.interruptAudio();
      if (this.debug)  { console.log("added audio " + JSON.stringify(audioItem) + ", isSpeaking="+this.isSpeaking() + ", nowPlaying="+JSON.stringify(this.nowPlaying) + ", time="+this.incLogTime() +", existing queue was "+this.audioQueueToString()); }
      this.audioQueue.push(audioItem);
        }
    }

  audioQueueToString()
  {
    return JSON.stringify(this.audioQueue);
  }

    finishedAudio(endedElem) // function finishedAudio in class
    {
    if (this.debug) 
    { let prevElemName = endedElem;
      if (endedElem)
      { if (endedElem instanceof HTMLAudioElement) prevElemName = "HTML "+endedElem.id;
        else if (endedElem instanceof SpeechSynthesisUtterance) prevElemName = "TTS '"+endedElem.text+"' ";
      else prevElemName = "Object "+JSON.stringify(endedElem);
      }
      console.log("Apparently finished audio "+prevElemName + 
      " nowPlaying="+ JSON.stringify(this.nowPlaying) + 
      ", time="+this.incLogTime() + 
      ", queue="+this.audioQueueToString() +
      ", isSpeaking()="+this.isSpeaking() + 
      ". tts.speaking=" + this.ttsSynth.speaking + 
      ", tts.pending="+this.ttsSynth.pending +
      ", tts.paused="+this.ttsSynth.paused
      );
    }
        var nextAudio = this.audioQueue[0]; // may not necessarily speak it
        if (nextAudio == undefined)
        {
            this.isPlayingAudio = false;
            this.nowPlaying = {voice:"finished",speech:"already finished"};   // i18nkey ?
        }
        else {
            let spoken = this.playAudio(nextAudio);
      if (spoken)
        this.audioQueue.shift();
        }
    }

    interruptAudio() // function interruptAudio in class
    {
        if (this.debug)  console.log("interruptAudio t="+ this.incLogTime() + 
      ", isSpeaking()="+this.isSpeaking() + 
      ". tts.speaking=" + this.ttsSynth.speaking + 
      ", tts.pending="+this.ttsSynth.pending +
      ", tts.paused="+this.ttsSynth.paused +
      ", nowPlaying="+JSON.stringify(this.nowPlaying) + 
      ", queue was ="+this.audioQueueToString());
        this.audioQueue = [];
    try
    {
      if (this.nowPlaying) {
        if (this.nowPlaying.voice == "screenreader" || this.nowPlaying.voice == "pending-tts") 
        {
          this.cancelTtsSpeech();
          // hopefully will still get an onUtteranceEvent event
        } else 
        if (this.nowPlaying.voice == 'recorded')
        {
          if (this.nowPlaying) {
            try 
            {
              this.nowPlaying.speech.load(); // want to abort. Previously .pause(). Chrome complains after too many
              if (this.debug)  console.info("interruptAudio paused recorded "+this.nowPlaying.speech.id);
              this.finishedAudio(this.nowPlaying);
              
            } catch (err) {
              console.error("Cannot pause audio" + err.toString());
              console.error(err);
            }
          } else
          {
            // console.info("interruptAudio() doesn't know this.nowPlaying: "+this.nowPlaying);
          }
        }
        else
        {
          // console.info("Don't know how to interrupt "+this.nowPlaying.voice);
        }
      }
      this.isPlayingAudio = false; // just in case we got confused?
    }
    catch (err)
    {
            console.error("Cannot interrupt audio" + err.toString());
    }
    }
  
  incLogTime()
  {
    var now = Date.now();
    var tdiff = now - this.lastLogTime;
    var s = "+"+tdiff.toString();
    this.lastLogTime = now;
    return s;
  }
  
    getVoiceFromName(wantName)
  {  if (!(this.voiceList && (this.voiceList.length > 0)))
      this.voiceList =  this.ttsSynth.getVoices();
    if (this.voiceList.length == 0)
      return undefined;
      let voice = "";
    for (voice of this.voiceList)
      if (voice.name == wantName)
        return voice;
    if (this.debug)
      console.warn("getVoiceFromName("+wantName+") not found");
  }

  setTtsVoiceName(voiceName, isPositive = true)
  { 
    if (this.debug)
      console.log("setTtsVoiceName "+voiceName);
    if (!this.isInit)
    { this.pendingVoiceName[isPositive?1:0] = voiceName;
      return;
    }
    let voice = this.getVoiceFromName(voiceName);
    if (voice)
    {
      if (isPositive)
      this.ttsVoicePositive = voice;
      else
      this.ttsVoiceNegative = voice;
    }
  }

  getVoiceName(isPositive)
  {
    if (isPositive && this.ttsVoicePositive)
      return this.ttsVoicePositive.name;
    if (!isPositive && this.ttsVoiceNegative)
      return this.ttsVoiceNegative.name;
    return undefined;
  }
  
  onVoicesChanged()
  {
    this.voiceList = this.ttsSynth.getVoices();   
    if (this.debug)
      console.log("onVoicesChanged "+this.voiceList.length);
    if (! this.isInit)
    { this.isInit = true;
      if (this.ttsVoicePositive == undefined && this.doorwayConsumer.options);
    }
    if (this.pendingVoiceName.length != 0)
    {
      this.setTtsVoiceName(this.pendingVoiceName[0], false);
      this.setTtsVoiceName(this.pendingVoiceName[1], true);
      this.pendingVoiceName = [];
    }
    this.finishedAudio();
  } 
}

export function promiseDelay(ms)
{
  return new Promise(resolve => setTimeout(resolve, ms));
}

