// Internationalisation of text strings
// Part of Doorway Text Type
// Also see scripts/convert_csv_translations_js.js

import { Doorway } from './doorway.js';

export class DoorwayInternationalisation extends Doorway
{
  constructor(activityInstance, translations, characterConfigArray = [], _lang='en')
  {
    super();
    this.activityInstance = activityInstance; // e.g. TextType
    this.translations = translations;
    this.characterConfigArray = characterConfigArray;
    this.currentLanguage = "en";
  }
  
  setLanguage(lang)
  {
    this.currentLanguage = lang;
    document.documentElement.lang = lang;
    this.translateAllText(document.documentElement);
  }
  
  saveTranslationsToCsv(textType_translations = { "en":{}, "cy":{} })
  {
    let elements = this.findElementsToTranslate(document.documentElement);
    let chars = this.findCharsToTranslate();
    let translations = {}; 
    Object.assign(translations, textType_translations.en);
    // translations will be the other way around from textType_translations: 
    // object with all i18keys, and each contains en, cy
    for (let elem of elements)
    { translations[elem[0]] = { "en": elem[1], "source":"html" };
    
    }
    for (let c of chars)
    { translations[c[0]] = { "en": c[1], "source":"chars" };
    }
    for (let screen of this.activityInstance.config.screens)
    {
      if (screen[2])
      {
        translations[screen[2] ] =
        {"en": screen[1], "source":"screens"};
      }
    }
    // now overwrite with previous translations
    for (let transKey of Object.keys(textType_translations.en))
    {
      translations[transKey] = { "source":"exists"};
      translations[transKey].en = textType_translations.en[transKey];
      if (transKey in textType_translations.cy)
      {
        translations[transKey].cy = textType_translations.cy[transKey];
      }
    }
    let strings = "\ufeff\"Source\",Key,English,Welsh\n";
    for (let key of Object.keys(translations))
    { let cy = "";
      let en = "";
      if ("en" in translations[key])
      {   let elem = translations[key];
        if (elem.en)
        {   en = this.csvCellEncode(elem.en);
        }
        if (elem.cy)
        { cy = this.csvCellEncode(elem.cy);
        }
        strings += [elem.source,this.csvCellEncode(key),en,cy].join(",")+"\n";
      }
    }
    this.downloadFromBrowser(strings, "translations.csv", "text/csv");
  }

    downloadFromBrowser(strings,filename, mimeType)
  {
    const blob = new Blob([strings], {type : mimeType});
    var link = document.createElement("a");
    var url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    } 

  findElementsToTranslate(elem) 
  { // returns list of [key,english]
    // recursive
    var translationCounter = 0;
    let returnList = [ ];
    if (elem.hasAttribute("data-i18nkey"))
    {
      returnList.push( [] );
      returnList[0].push(elem.attributes["data-i18nkey"].value);
      if (elem.hasChildNodes())
      {
        for (let i = 0; i < elem.childNodes.length; i++)
        {
          let elemChildNode = elem.childNodes[i];
          if (elemChildNode instanceof Text)
          {
            if (elemChildNode.textContent.trim().length > 0)
            {
              translationCounter++;
            }
          }
        }
      }
      if (elem.hasAttribute("alt") )
      {
        returnList[0].push(elem.attributes.alt.value);
        translationCounter++;
      }else if (elem.hasAttribute("title") )
      {
        returnList[0].push(elem.attributes.title.value);
        translationCounter++;
      }else
      {
        returnList[0].push(elem.textContent);
      }
      
      if (translationCounter > 1)
      {
        console.error(elem.attributes["data-i18nkey"].value + " element is ambiguous");
        console.error(elem);
      }
    }
    var r;
    for (let child of elem.children) {
      if (elem.children.length > 0) {
        r = this.findElementsToTranslate(child);
        returnList = returnList.concat(r);
      }
    } 
    return returnList;  
  }

  findCharsToTranslate()
  { // returns list of [key,english]
    let returnList = [];
    for (let charObj of this.characterConfigArray)
    {
      let i18nkeySpeech = this.createChari18nkey(charObj.character);
      let obj = [];
      obj.push(i18nkeySpeech);
      obj.push(charObj.speechSynthesiser);
      returnList.push(obj);
    }
    return returnList;
  }

  createChari18nkey(speechChar, altName = 0)
  {
    let altLimit = 65535;
    if (altName == 2) 
      altLimit = 127;
    if (speechChar.charCodeAt(0) < 35 | speechChar.charCodeAt(0) > altLimit)
    {
      speechChar = 'u'+speechChar.charCodeAt(0);
    }
    var i18nkeySpeech = "keyboard.speak." + speechChar;
    return i18nkeySpeech;
  }

  getText(i18nkey, namedParams={})
  {
    if (! (i18nkey in this.translations[this.currentLanguage]) )
    {
      console.error("No translation in "+this.currentLanguage+" for "+i18nkey);
      return this.currentLanguage + " " + i18nkey; // fallback should not happen
    }
    var st = this.translations[this.currentLanguage][i18nkey];
    st = this.replaceParams(st,namedParams);
    return st;
  }

    // replaceParams() is for use when the client component already has the text.
  replaceParams(st, namedParams={})
  {
    for (let p of Object.keys(namedParams))
    { st = st.replace("{"+p+"}", namedParams[p]);
    }
    return st;
  }
  
  hasTranlationKey(i18nKey)
  {if (i18nKey in this.translations[this.currentLanguage])
    return true;
    return false;
  }
  
  translateAllText(elem)
  {
    if (elem.hasAttribute("data-i18nkey"))
    {
      if (elem.hasAttribute("alt") )
      {
        elem.attributes.alt.value = this.getText(elem.getAttribute("data-i18nkey") );
      } else if (elem.tagName == "A")
      {
        elem.attributes.title.value = this.getText(elem.getAttribute("data-i18nkey") );
      } else if (elem.hasAttribute("title") )
      {
        elem.attributes.title.value = this.getText(elem.getAttribute("data-i18nkey") );
      } else
      {
        let t = this.getText(elem.getAttribute("data-i18nkey") );
        if (elem.children.length == 0)
          elem.textContent = t;
        else
          elem.textContent = t;
      }
      //if this element has children (elements) and it has an alt attribute then we are translating the alt attribute
      //if this element has no children (elements) but has plain text then that is what we are translating
      //element.children is different from element.childNodes
      //element.textContent tells us the text of any child elements too
    }
    
    for (let child of elem.children)
    {
      if (elem.children.length > 0)
      {
        this.translateAllText(child);
      }
    }
  }
  
  csvCellEncode(v)
  {
    if (typeof(v) == "number")
      return v;
    if (typeof(v) == "undefined")
      return "";
    v = String(v);
    v = v.replaceAll("\"","\"\"");
    v = v.replaceAll("\r","\\r");
    v = "\""+v+"\"";
    return v;
  }
  
  // Save Text Type exercises into a CSV spreadsheet with columns:
  // Header rows:
  // - hand layouts, exercise name, blank, special flags
  // Sentence rows:
  // - blank, target typing text, introduction message.
  // Use this by running Text Type in your browser, open F12 dev console, execute:
  // dwMainActivity.i18n.exportTextTypeExercisesToFile(dwMainActivity.sentencesConfig)
  exportTextTypeExercisesToFile(exercises)
  {
    let csvRows = [["HandLayouts","Text","Introduction","ExType","Platforms",this.csvCellEncode("Exported "+new Date().toString())]];
    for (let ex of exercises)
    { let special = ex.specialExercise;
      if (special == undefined)
        special = "Exercise";
        let cells = [
      this.csvCellEncode(ex.handLayouts.join(",")), 
      this.csvCellEncode(ex.groupName),
      "",
      this.csvCellEncode(special)];
           csvRows.push(cells);
       if (ex.specialExercise == "isComposedCharacter")
       {
         for (let intro of ex.introduction)
           csvRows.push([ this.csvCellEncode("\""),this.csvCellEncode(intro) ] );
         for (let target of ex.sentences)
         {
           csvRows.push([ 
            this.csvCellEncode("> "+String(target.text)), 
          this.csvCellEncode(target.title), 
          this.csvCellEncode(target.speech), 
          this.csvCellEncode(target.repeats),
          this.csvCellEncode(target.platforms)
          ]);
          for (let kc of target.keyCombinations)
          { 
            let m = '';
            for (let k in kc.modifierKeys)
              m += ','+k+':'+kc.modifierKeys[k];
            let pf = '';
            console.log(kc.printableKeyFinger);
            if (kc.printableKeyFinger && kc.printableKeyFinger != "default")
              pf = ":"+String(kc.printableKeyFinger);
            csvRows.push( [ 
              this.csvCellEncode(String(kc.printableKey)+pf), 
              this.csvCellEncode(kc.speech),
              this.csvCellEncode(m.substr(1)),
              this.csvCellEncode(''),
              this.csvCellEncode(kc.keyUpSpeech)
            ]);
          }
         }
       }
       else
       {
         for (let sentence of ex.sentences)
           csvRows.push( [ 
            "", 
            this.csvCellEncode(sentence[0]), 
            this.csvCellEncode(sentence[1]) 
          ] );
       }
    }
    let csvData = "\ufeff";
    for (let row of csvRows)
            csvData += row.join(",") + "\r\n";
    this.downloadFromBrowser(csvData, "exercises.csv", "text/csv");
  }
}