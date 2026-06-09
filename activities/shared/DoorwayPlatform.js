/** Doorway Online learning activities.
 * This file contains general capabilities for the whole Doorway environment,
 * not specific activities.
 * Copyright (c) Roger Spooner 2017
 * Based on features of Flash-based web site doorwayonline.org.uk
 */


export class DoorwayPlatform
{
  isChromeOS()
  {
    if (navigator.userAgent.indexOf(" CrOS ") >= 0)
      return true;
    return false;
  }

  isWindows()
  {
    if (navigator.userAgent.indexOf("Windows NT ") >= 0)
      return true;
    if (navigator.userAgent.indexOf("Win32;") >= 0)
      return true;
    if (navigator.userAgent.indexOf("Win64;") >= 0)
      return true;
      return false;
  }
  
  isMacOS()
  {
    if (navigator.userAgent.indexOf(" Mac OS ") >= 0)
      return true;
    return false;
  }
  
  getSimplePlatformName()
  {
    if (this.isWindows())
      return "Windows";
    if (this.isChromeOS())
      return "CrOS";
    if (this.isMacOS())
      return "MacOS";
    return "Unspecific OS";
  }
}
