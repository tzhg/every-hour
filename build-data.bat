@echo off

del "data\data-csv.txt" /q
for %%a in (data\archive\*) do type %%a >> data\data-csv.txt
for /F "delims=" %%j in (data\data-input.txt) do (
  echo %%j|findstr /b "240102030405060708091011121314151617181920212223" >nul && goto :enddata
  echo %%j>> data\data-csv.txt
)
:enddata

python mangle-data.py