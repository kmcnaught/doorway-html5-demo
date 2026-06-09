
/** Switch input Scanning
 *  For Doorway Assistive Technology Trust
 *  (c) Roger Spooner 2017
 */

/** A Switch scanning item. This includes a JavaScript object to handle the selection
 * and a DOM element to be highlighted.
 * There should be one per scannable group and one per individual scannable item.
 *
 * Create a new Scannable object or group.
 *  @param element An HTML element which will be given the CSS class .scan_highlight
 *  @param onSelectFn Function to call when selected by the user. To pass parameters
 *      to this, use Function.prototype.bind() before constructing this Scannable.
 */
export function Scannable(element, onSelectFn)
// class
{

  /** Add an existing Scannable object as the next child of this group */
  this.addChild = function(child)
  {
    if (!this.children.includes(child))
      this.children.push(child);
    child.parent = this;
    child.switchScanner = this.switchScanner;
  };

  this.removeChild = function(child)
  {
    var i = this.children.indexOf(child);
    if (i >= 0)
    {
      this.children[i].highlight(false, false);
      this.children[i].parent = undefined;
      this.children[i].switchScanner = undefined;
      this.children.splice(i, 1);
    }
  };

  this.removeAllChildren = function()
  {
    var i;
    if (this.switchScanner)
      this.switchScanner.resetScan(true); // In case we are already scanning inside this group
    // this.highlight(false, false);
    for (i = 0; i < this.children.length; i++)
    {
      this.children[i].parent = undefined;
      this.children[i].switchScanner = undefined;
    }
    this.children = [];
  };

  /** Highlight this item for scanning or all of its children
   * @param isHighlight true to show highlight, false to remove highlight
   * @param isChild true if this highlight just as a child of the real highlighted item.
   *               false if its this item itself. */
  this.highlight = function(isHighlight, isChild)
  {
    if (this.element)
    { // Scannable groups probably don't have an element of their own
      if (isHighlight)
      {
        this.element.classList.add("scan_highlight");
      }
      else
      {
        this.element.classList.remove("scan_highlight");
      }
    }
    this.isHighlight = isHighlight;
    this.isChildHighlight = isChild;
    var c;
    for (c = 0; c < this.children.length; c++)
    {
      this.children[c].highlight(isHighlight, true);
    }
  };

  this.scanNone = function()
  {
    this.highlight(false, false);
    this.nHighlight = -1;
  };

  /** Highlight the first child Scannable of this group.
   * We assume nothing is currently highlighted  */
  this.scanFirstChild = function()
  {
    if (!this.switchScanner.isActive)
      return;
    this.numUnselectedLoops = 0;
    if (this.nHighlight >= 0)
      this.children[this.nHighlight].highlight(false, false);
    if (this.children.length >= 1)
    {
      this.children[0].highlight(true, false);
      this.nHighlight = 0;
    }
    else
      this.nHighlight = -1;
  };

  /** Increment the scanning highlight to the next child */
  this.scanNextChild = function()
  {
    if (!this.switchScanner.isActive)
      return;
    if (this.nHighlight >= 0)
      this.children[this.nHighlight].highlight(false, false);
    if (this.children.length == 0)
    {
      this.nHighlight = -1;
      return;
    }
    var child = this.nHighlight;
    child++;
    if (child >= this.children.length)
    {
      child = 0;
      this.numUnselectedLoops++;
    }
    this.children[child].highlight(true, false);
    this.nHighlight = child;
    if (this != this.switchScanner)
    {
      if (this.numUnselectedLoops == this.switchScanner.doorway.general_config.parameters.max_scanning_loops)
      {
        this.switchScanner.start();
      }
    }
  };

  // constructor
  this.element = element;
  this.selectFn = onSelectFn;
  this.children = [];
  this.highlightedChild = undefined;
  this.isHighlight = false;
  this.isChildHighlight = false;
  this.parent = undefined;
  this.switchScanner = undefined;
  this.numUnselectedLoops = 0;
}

/** Manager object for scanning process. There should only be one instance. */
export function SwitchScanner(doorway) // class extends Scannable
{
  // constructor ...
  Scannable.call(this, undefined, undefined);

  this.scanNext = function()
  {
    if (this.currentlyScanningParent == undefined)
    {
      this.scanFirstChild();
      this.currentlyScanningParent = this;
    }
    else
    {
      this.currentlyScanningParent.scanNextChild();
    }
  };

  this.scanSelect = function()
  {
    if (this.currentlyScanningParent &&
        this.currentlyScanningParent.nHighlight >= 0)
    {
      var selectChild = this.currentlyScanningParent.children[this.currentlyScanningParent.nHighlight];
      while (selectChild.children.length == 1)
      {
        selectChild = selectChild.children[0];
      }
      if (selectChild.selectFn)
      { // if there is a select function, call it but we might continue scanning
        selectChild.selectFn();
        this.resetScan(true);
      }
      if (this.isActive)
      {
        if (selectChild.children.length == 0)
          selectChild = this;
        if (selectChild.children.length >= 1)
        {
          selectChild.highlight(false, false);
          this.currentlyScanningParent = selectChild;
          selectChild.scanFirstChild();
        }
      }
    }
  };

  /** Cancel current scan, or start again from the beginning*/
  this.resetScan = function(continuing)
  {
    if (!continuing && this.timer)
    {
      window.clearInterval(this.timer);
      this.timer = undefined;
    }
    if (this.currentlyScanningParent)
    {
      this.highlight(false, false);
      this.currentlyScanningParent.nHighlight = -1;
    }
    this.currentlyScanningParent = undefined;

  };

  this.start = function()
  {
    this.isActive = true;
    this.resetScan(true);
    if (this.timer)
    {
      window.clearInterval(this.timer);
      this.timer = undefined;
    }
    if (this.doorway.options.num_switches == 1)
    {
      this.timer = window.setInterval(this.onScanTimer.bind(this),
        this.doorway.options.scanDelay);
    }
  };

  this.stop = function()
  {
    this.resetScan(false);
    this.isActive = false;
  };

  this.onScanTimer = function()
  {
    this.scanNext.call(this);
  };

  this.onKeyDown = function(evt)
  {
    if (!this.isActive)
      return;
    if (this.doorway.options.enable_scanning == false)
      return;
    if (evt)
    {
      if (evt.type == "keydown")
      { // Currently assuming 2 switch inputs on Space and Enter, no timer
        if (this.doorway.options.num_switches == 2)
        {
          if (evt.keyCode == 32)
          {
            this.scanNext();
            evt.preventDefault();
          }
          if (evt.keyCode == 13)
          {
            this.scanSelect();
            evt.preventDefault();
          }
        }
        if (this.doorway.options.num_switches == 1)
        {
          if (evt.keyCode == 32)
          {
            this.scanSelect();
            evt.preventDefault();
          }
        }
      }
    }
  };

  // ... constructor
  this.switchScanner = this;
  this.doorway = doorway;
  this.currentlyScanningParent = undefined;
  this.timer = undefined;
  this.isActive = false;
}
 
