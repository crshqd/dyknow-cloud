
# Creating and Publishing a New Release

## Manual Method
1. After a chromebook build completes, login to S3 and download the chrome mon zip (`dyknow-devops/artifacts/DyKnow.Monitor.Chromebook/dev-VERSION_NUMBER`).
2. Sign into the chrome developers dashboard (https://chrome.google.com/webstore/developer/dashboard) username is dyknowtechteam password can be found https://github.com/DyKnow/DyKnowMe/wiki/Google-Chrome-Admin-Management-Console-%26-Google-Analytics
3. Select the extension (the one that's public)
4. Upload the updated package (zip from S3)
5. Ensure privacy tab is filled out (see privacy questions section below)
6. Ensure Store icon is visible under Graphic assets
7. Save draft
8. Review everything 
9. Select "Publish Changes" at the bottom of the page
10. Come back to this page to see the status go to Published
11. Update the Chromebook connector_version setting in the database to the newest stable version. (`USE DyKnowMeCore UPDATE Setting SET Value = 'VERSION_NUMBER' WHERE Name = 'dyknow.cloud.v1.connector_version.chromebook' AND Level = 0 AND Foreignid = 0`)


## Private Wonkyd extension
We dont have the private key for this guy. Instead you need to 
1. edit the manifest to remove the key
2. delete the private key property from the file

## Getting Started 
1. cd to root and `npm install`
2. if not already installed on the machine `npm install -g grunt-cli`
3. if not installed already `npm install -g karma`
4. if not installed already `npm install -g karma-cli`
5. verify it worked by running `grunt dev`

## Privacy questions
**Single purpose description**: Classroom management software to allow teachers to control and monitor student Chromebook devices based on the current classroom needs.

### Permission justification

**management justification**: Allow teachers to turn extensions and apps on/off dynamically. Extension name and ids get logged in diagnostic logging to help teachers create the plans and for troubleshooting.

**webNavigation justification**: Allow teachers to specify a list of allowed or blocked websites and have our software block navigation to non-allowed websites. Also, report what websites students are on so that teachers can track progress (when on allowed websites) or to have conversations about choices (many teachers opt not to set up the limits and instead use the extra freedom as an opportunity to teach about responsibility). Navigation information is also logged for troubleshooting.

**activetab justification**: We currently have all_urls, but we also keep activeTab as a workaround for older versions of chrome where it would not properly take screenshots of the active tab unless the activeTab permission was explicitly used (new schools will often have handfuls of chromebooks on v67 or sometimes before). Also, when permissions are removed or added during the school year, all extensions in the district stop functioning until students click through to accept the new permissions (even when the district specified it on the force install list). This ends up causing a lot of unnecessary friction in the classroom.

**identity justification**: We use the email of the logged-in student to identify the student and ensure they are directed to the correct classes.

**identity.email justification**: We use the email of the logged-in student to identify the student and ensure they are directed to the correct classes.

**enterprise.deviceAttributes justification**: Log the device id to diagnostic logging to assist help desk and administrators troubleshoot which device was being used when an issue occurred.

**storage justification**: Store internal state information that needs to be true even if we started out offline or if we are restarting due to an error.

**tabs justification**: Allow teachers to specify a list of allowed or blocked websites and have our software block tabs on non-allowed websites. Also, report what websites student is actively on so that teachers can track progress (when on allowed websites) or to have conversations about choices (many teachers opt not to set up the limits and instead use the extra freedom as an opportunity to teach about responsibility). Tab information is also logged for troubleshooting.

**unlimitedStorage justification**: We use diagnostic logging turned on to help admins and support troubleshoot what events let up to a student not showing up or operating incorrectly. We rotate the logs regularly, but cannot guarantee which limit would be set otherwise and do not want students to be disturbed during class to accept quote increases.

**desktopCapture justification**: Many teachers have difficulty reading urls alone and so rely on screenshot visuals to check in on student progress. Sometimes teachers want to see the full screen of the student instead of only the active tab. This enables that interaction.

**system.memory justification**: Used for troubleshooting scenarios where a memory constrained device leads to different behavior.

**Host permission justification**: Need all_urls as we are responsible for enforcing the blocking plans on any url. The googleapis match pattern is used for pre-chrome 38 devices getting the email.

**Are you using remote code?** No, I am not using remote code

### Data Usage

✅ **Personally identifiable information**

❌ Health information

❌ Financial and payment information

❌ Authentication information

✅ **Personal communications**

✅ **Location**

✅ **Web history**

✅ **User activity**

✅ **Website content**

✅✅✅ Certify all three disclosures beginning with "I do not...".
