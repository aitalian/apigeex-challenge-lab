# Develop and Secure APIs with Apigee X: Challenge Lab

https://partner.cloudskillsboost.google/focuses/32743?parent=catalog

My solution step-by-step and source files.

## Task 1 Solution

### Step 1: Setup Using Cloud Shell

In the GCP Console for the Apigee project, open the Cloud Shell and enter the following commands:

```sh
# Enable prerequisite APIs
gcloud services enable compute.googleapis.com
gcloud services enable servicenetworking.googleapis.com
gcloud services enable apigee.googleapis.com

# Enable Cloud Translation API
gcloud services enable translate.googleapis.com

# Enable IAM API
gcloud services enable iam.googleapis.com

# Create service account `apigee-proxy` with role: Logging > Logs Writer
gcloud iam service-accounts create apigee-proxy --display-name="apigee-proxy"
gcloud projects add-iam-policy-binding ${GOOGLE_CLOUD_PROJECT} --member="serviceAccount:apigee-proxy@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com" --role="roles/logging.logWriter"
echo "Service Account Name for Apigee deployment: apigee-proxy@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com"
```

### Step 2: Apigee UI

- In a new tab, navigate to the Apigee UI: https://apigee.google.com

- Create a *Reverse Proxy* named `translate-v1` with a base path of `/translate/v1` and target URL: `https://translation.googleapis.com/language/translate/v2` - do not make any other changes.

- Click *Edit Proxy*

- Under *Target Endpoints*, click `default` to edit it. Copy/paste the contents from [Target Endpoints/default.xml](./Target%20Endpoints/default.xml) which adds the following section under `HTTPTargetConnection` for Authentication using a GoogleAccessToken:

    ```xml
          <Authentication>
            <GoogleAccessToken>
                <Scopes>
                    <Scope>https://www.googleapis.com/auth/cloud-translation</Scope>
                </Scopes>
            </GoogleAccessToken>
        </Authentication>
    ```

- Click *Save*.

- Click *Deploy to eval* and for Service Account use the one created earlier (outputted in the Cloud Shell)

### Step 3: Test using Cloud Shell

- Run the following in Cloud Shell and **do not proceed** until you see `ORG IS READY TO USE`

    ```sh
    export INSTANCE_NAME=eval-instance; export ENV_NAME=eval; export PREV_INSTANCE_STATE=; echo "waiting for runtime instance ${INSTANCE_NAME} to be active"; while : ; do export INSTANCE_STATE=$(curl -s -H "Authorization: Bearer $(gcloud auth print-access-token)" -X GET "https://apigee.googleapis.com/v1/organizations/${GOOGLE_CLOUD_PROJECT}/instances/${INSTANCE_NAME}" | jq "select(.state != null) | .state" --raw-output); [[ "${INSTANCE_STATE}" == "${PREV_INSTANCE_STATE}" ]] || (echo; echo "INSTANCE_STATE=${INSTANCE_STATE}"); export PREV_INSTANCE_STATE=${INSTANCE_STATE}; [[ "${INSTANCE_STATE}" != "ACTIVE" ]] || break; echo -n "."; sleep 5; done; echo; echo "instance created, waiting for environment ${ENV_NAME} to be attached to instance"; while : ; do export ATTACHMENT_DONE=$(curl -s -H "Authorization: Bearer $(gcloud auth print-access-token)" -X GET "https://apigee.googleapis.com/v1/organizations/${GOOGLE_CLOUD_PROJECT}/instances/${INSTANCE_NAME}/attachments" | jq "select(.attachments != null) | .attachments[] | select(.environment == \"${ENV_NAME}\") | .environment" --join-output); [[ "${ATTACHMENT_DONE}" != "${ENV_NAME}" ]] || break; echo -n "."; sleep 5; done; echo "***ORG IS READY TO USE***";
    ```

- Test the API proxy.
  - In Cloud Shell, open an SSH connection to the `apigeex-test-vm`

    ```sh
    gcloud compute ssh apigeex-test-vm --zone=us-west1-a --force-key-file-overwrite
    ```

  - On the test VM, run the following command:

    ```sh
    curl -i -k -X POST "https://eval.example.com/translate/v1" -H "Content-Type: application/json" -d '{ "q": "Translate this text!", "target": "es" }'
    ```

  - Observe the response. Note the request and response are being proxied through as-is. It should look similar to the following:

    ```json
    {
        "data": {
            "translations": [
                {
                    "translatedText": "¡Traduce este texto!",
                    "detectedSourceLanguage": "en"
                }
            ]
        }
    }
    ```

### Step 4: Apigee UI

- Click the *Check my progress* button to complete the task.

---

## Task 2 Solution

Using the files in this repo, perform the following steps in order:

1. Add the Resources using contents from the referenced files:
   1. JavaScript File - BuildLanguagesResponse.js
   2. Property Set - language.properties
2. Add Policies using contents from the referenced files:
   1. JavaScript: JS-BuildLanguagesResponse -> Script File: BuildLanguagesResponse.js
   2. Assign Message:
      1. AM-BuildLanguagesRequest
      2. AM-BuildTranslateRequest
      3. AM-BuildTranslateResponse
3. Add Proxy Endpoints

Then Save, and Deploy.
