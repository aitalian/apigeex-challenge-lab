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

#### Optional: Running your own Apigee Evaluation Lab

If you are running this in your own Apigee lab (not in Cloud Skills Boost), you'll need to enable an Apigee Evaluation first using the [Apigee UI](https://apigee.google.com). Follow the wizard and assume defaults were appropriate. For the last question in the wizard, do NOT create a Load Balancer (to save costs for testing) - your API will then only be accessible locally, via a test VM. Create that VM using the following commands in Cloud Shell:

```sh
export PROJECT_ID=$GOOGLE_CLOUD_PROJECT
export AUTH="Authorization: Bearer $(gcloud auth print-access-token)"
export SUBNET=default
export INSTANCE_NAME=apigeex-test-vm
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
export VM_REGION=$(curl -s -H "$AUTH" https://apigee.googleapis.com/v1/organizations/$PROJECT_ID/instances | jq -r '.instances[0].location')
export VM_ZONE=$(gcloud compute zones list | grep ${VM_REGION} | head -n 1 | awk '{print $2}')

# Create VM
gcloud compute --project=$PROJECT_ID \
    instances create $INSTANCE_NAME \
    --zone=$VM_ZONE \
    --machine-type=e2-micro \
    --subnet=$SUBNET \
    --network-tier=PREMIUM \
    --no-restart-on-failure \
    --maintenance-policy=TERMINATE \
    --preemptible \
    --service-account=$PROJECT_NUMBER-compute@developer.gserviceaccount.com \
    --scopes=https://www.googleapis.com/auth/cloud-platform \
    --tags=http-server,https-server \
    --image=debian-10-buster-v20210122 \
    --image-project=debian-cloud \
    --boot-disk-size=10GB \
    --boot-disk-type=pd-standard \
    --boot-disk-device-name=$INSTANCE_NAME \
    --no-shielded-secure-boot \
    --shielded-vtpm \
    --shielded-integrity-monitoring \
    --reservation-affinity=any

# Connect to VM
gcloud compute ssh $INSTANCE_NAME --zone=$VM_ZONE --project=$PROJECT_ID

### On the VM run the following commands
sudo apt-get update -y
sudo apt-get install -y jq

export AUTH="Authorization: Bearer $(gcloud auth print-access-token)"
export PROJECT_ID=$(curl -s -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/project/project-id)
export ENV_GROUP_HOSTNAME=$(curl -H "$AUTH" https://apigee.googleapis.com/v1/organizations/$PROJECT_ID/envgroups -s | jq -r '.environmentGroups[0].hostnames[0]')
export INTERNAL_LOAD_BALANCER_IP=$(curl -H "$AUTH" https://apigee.googleapis.com/v1/organizations/$PROJECT_ID/instances -s | jq -r '.instances[0].host')

curl -H "$AUTH" https://apigee.googleapis.com/v1/organizations/$PROJECT_ID | jq -r .caCertificate | base64 -d > cacert.crt

# Send a test request to the hello-world API to verify connectivity
curl -is -H "Host: $ENV_GROUP_HOSTNAME" \
  https://example.$PROJECT_ID.apigee.internal/hello-world \
  --cacert cacert.crt \
  --resolve example.$PROJECT_ID.apigee.internal:443:$INTERNAL_LOAD_BALANCER_IP
```

### Step 2: Apigee UI

- In a new tab, navigate to the Apigee UI: https://apigee.google.com

- Create a *Reverse Proxy* named `translate-v1` with a base path of `/translate/v1` and target URL: `https://translation.googleapis.com/language/translate/v2`. Click *Next*, and then *Next* again - do not make any other changes. Click *Create*.

- Click *Edit Proxy* and then click the *Develop* tab.

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
