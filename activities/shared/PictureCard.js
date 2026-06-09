/** Doorway Online learning activities.
 * This file contains general capabilities for the whole Doorway environment,
 * not specific activities.
 * Copyright (c) Roger Spooner 2017
 * Based on features of Flash-based web site doorwayonline.org.uk
 */

import { ElementObject } from './ElementObject.js';

/** Representation of a playing card which can be facing or turned down.
 * The card will contain two div's. One for the face and one for the back. */
export class PictureCard extends ElementObject
{
  /** Either show or hide the card.
   *  @param facing True to see the content of the card. False to see its obverse.
   *  @param animate True if you want to see the card rotate beautifully.
   *  @return the old state; True it it the content had been facing the user.
   */
  setFacing(newfacing, animate) // function setFacing in class
  {
    var oldface = this.facing;
    this.facing = newfacing;
    if (oldface === newfacing)
    {
      return oldface;
    }
    var card = this;
    var div1, div2;
    var animationEndEventName = "animationend";
    var animClass = "flip_something";
    var onAnimationEnd = function()
    { // assume it's an animationend event?
      div1.classList.add("hidden_panel");
      div1.classList.remove("shown_panel");
      div2.classList.remove("hidden_panel");
      div2.classList.add("shown_panel");
      card.element.classList.remove("flip_obverse_to_face");
      card.element.classList.remove("flip_face_to_obverse");
      card.element.removeEventListener(animationEndEventName, onAnimationEnd);
    };
    if (newfacing)
    {
      div1 = this.element.getElementsByClassName("obverse")[0];
      div2 = this.element.getElementsByClassName("face")[0];
      animClass = "flip_obverse_to_face";
    }
    else
    {
      div1 = this.element.getElementsByClassName("face")[0];
      div2 = this.element.getElementsByClassName("obverse")[0];
      animClass = "flip_face_to_obverse";
    }
    if (animate)
    {
      this.element.addEventListener(animationEndEventName, onAnimationEnd);
      this.element.classList.add(animClass);
    } else
    {
      div1.classList.remove("shown_panel");
      div1.classList.add("hidden_panel");
      div2.classList.remove("hidden_panel");
      div2.classList.add("shown_panel");
    }
    return oldface;
  }

  // constructor for PictureCard
  constructor()
  {
    super( "div");
    this.element.classList.add("picture_card");
    // The card must contain exactly two <div>'s. One for the face and one for the back.
    var faceDiv = document.createElement("div");
    faceDiv.className = "face";
    this.element.appendChild(faceDiv);
    this.face = faceDiv;
    var obverseDiv = document.createElement("div");
    obverseDiv.className = "obverse";
    this.element.appendChild(obverseDiv);
    this.obverse = obverseDiv;
    this.setFacing(true, false);
    this.inPlay = true; // Cards already matched are not in play
    this.element.classList.add("in_play");
  }
}
