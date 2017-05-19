#!/usr/bin/env bash
cordova prepare ios
cp exportOptions.plist ../platforms/ios/
cd ../platforms/ios
echo $PWD
projectName=有色LRP
echo $projectName.xcworkspace
xcodebuild -workspace  $projectName.xcworkspace -scheme $projectName -sdk iphoneos archive -archivePath $PWD/build/$projectName.xcarchive -configuration Release

xcodebuild -exportArchive -archivePath $PWD/build/$projectName.xcarchive -exportOptionsPlist exportOptions.plist -exportPath $PWD/build

# rename
mv $projectName.ipa yesapp.ipa
# copy to
#cp yesapp.ipa /Users/bokeadmin/project/ios_compile/pack2/yigomobile/public/release/com.bokesoft.dyysapp/ios/
# back
rm -r build
