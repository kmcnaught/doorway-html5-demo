/** Doorway Online learning activities.
 * This file contains general capabilities for the whole Doorway environment,
 * not specific activities.
 * Copyright (c) Roger Spooner 2017
 * Based on features of Flash-based web site doorwayonline.org.uk
 */

let ElementObject_nextElementId = 1000;

/** An ElementObject is a JavaScript class containing an HTML element
 *  and other information about the interactive Doorway item it represents.
 *  It has a numeric ID which can be looked up, for example by event listeners.
 */
export class ElementObject
{
  /** Wrap a DOM element in an ElementObject object, within the member
   *  'element'
   * @param elementName Type of HTML element as String e.g. 'div'
   * @return Constructs class instance containing an element as this.element
   */
  constructor(elementName)
  {
    this.element = document.createElement(elementName);
    this.id = ElementObject_nextElementId;
    ElementObject_nextElementId++;
    this.element.id = this.id;
  }
}

