# Updating data:

* Edit "data\data-input.txt"
* Run build-data.bat:
 * Combines data "from data\archive" and "data\data-input.txt"
 * Removes non-data at end
 * Mangles data using mangle-data.py

# Data format:

* Times are in local time zone
* Each row consists of 24 hours, however each hour can have 0, 1, 2, or more activities
* "_" is for hours with 0 activities (due to moving through time zones etc.)
* "+" is used for hours with multiple activities (due to moving through time zones etc.)
