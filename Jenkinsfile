pipeline {
    agent any

    tools {
        nodejs 'Node20'
    }

    environment {
        DOCKERHUB_CRED = credentials('dockerhub-credentials')

        IMAGE_NAME = "${DOCKERHUB_CRED_USR}/cicd-tasklist-frontend"
        IMAGE_TAG  = "${BUILD_NUMBER}"
        IMAGE_REF  = "${IMAGE_NAME}:${IMAGE_TAG}"
    }

    options {
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    triggers {
        pollSCM('H/5 * * * *')
    }

    stages {

        stage('Install dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Unit tests') {
            steps {
                sh 'npm run test:coverage'
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'reports/junit.xml'
                }
            }
        }

        stage('SonarQube analysis') {
            steps {
                script {
                    def scannerHome = tool 'SonarScanner'
                    withSonarQubeEnv() {
                        sh "${scannerHome}/bin/sonar-scanner"
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Build Docker image') {
            steps {
                sh 'docker build -t ${IMAGE_REF} -t ${IMAGE_NAME}:latest .'
            }
        }

        stage('Trivy scan + reports') {
            steps {
                sh '''
                    mkdir -p reports
                    trivy image --no-progress --format table \
                        --output reports/trivy-report.txt ${IMAGE_REF}
                    trivy image --no-progress --format json \
                        --output reports/trivy-report.json ${IMAGE_REF}
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'reports/trivy-report.*', allowEmptyArchive: true
                }
            }
        }

        stage('Trivy security gate') {
            steps {
                sh '''
                    trivy image --no-progress --exit-code 1 \
                        --severity HIGH,CRITICAL ${IMAGE_REF}
                '''
            }
        }

        stage('Generate SBOM') {
            steps {
                sh '''
                    mkdir -p reports
                    trivy image --no-progress --format cyclonedx \
                        --output reports/sbom.cdx.json ${IMAGE_REF}
                    trivy image --no-progress --format spdx-json \
                        --output sbom-spdx.json ${IMAGE_REF}
                    cp sbom-spdx.json reports/sbom-spdx.json
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'reports/sbom.cdx.json,sbom-spdx.json', allowEmptyArchive: true
                }
            }
        }

        stage('Push Docker image') {
            steps {
                sh '''
                    echo "${DOCKERHUB_CRED_PSW}" | docker login -u "${DOCKERHUB_CRED_USR}" --password-stdin
                    docker push ${IMAGE_REF}
                    docker push ${IMAGE_NAME}:latest
                    docker logout
                '''
            }
        }
    }

    post {
        always {
            deleteDir()
        }
    }
}
