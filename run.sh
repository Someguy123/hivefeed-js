#!/usr/bin/env bash
#####################################################################################################
# Hivefeed-JS manager
# Released under GNU GPL v3 by Someguy123
#
# Github: https://github.com/Someguy123/hivefeed-js
#
# For more information, see README.md - or run `./run.sh help`
#
#####################################################################################################

SFJS_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SFJS_DIR"

[[ -f "${SFJS_DIR}/.env" ]] && source "${SFJS_DIR}/.env"


: ${DOCKER_NAME="hivefeed"}
: ${DOCKER_IMAGE="hivefeed-js"}
: ${DK_TAG="someguy123/hivefeed-js"}

# Amount of time in seconds to allow the docker container to stop before killing it.
# Default: 30 seconds
: ${STOP_TIME=30}

# Array of Privex ShellCore modules to be loaded during ShellCore initialisation.
SG_LOAD_LIBS=(gnusafe helpers trap_helper traplib)

# Run ShellCore auto-install if we can't detect an existing ShellCore load.sh file.
[[ -f "${HOME}/.pv-shcore/load.sh" ]] || [[ -f "/usr/local/share/pv-shcore/load.sh" ]] || \
    { curl -fsS https://cdn.privex.io/github/shell-core/install.sh | bash >/dev/null; } || _sc_fail

# Attempt to load the local install of ShellCore first, then fallback to global install if it's not found.
[[ -d "${HOME}/.pv-shcore" ]] && source "${HOME}/.pv-shcore/load.sh" || \
    source "/usr/local/share/pv-shcore/load.sh" || _sc_fail

if [[ ! -f "${SFJS_DIR}/config.json" ]]; then
    msg
    msg yellow " [WARN] Looks like you haven't created a 'config.json' file yet."
    msg yellow " [WARN] We're going to copy 'config.example.json' into 'config.json' for you :)\n"
    cp -vi "${SFJS_DIR}/config.example.json" "${SFJS_DIR}/config.json"
    msg green "\n >>> Copied '${SFJS_DIR}/config.example.json' to '${SFJS_DIR}/config.json' \n"
fi

img_exists() {
    local imgcount=$(docker images "${DOCKER_IMAGE}" | wc -l)
    (( imgcount >= 2 ))
}

ct_exists() {
    local ctcount=$(docker ps -a -f name="^/${DOCKER_NAME}$" | wc -l)
    (( ctcount >= 2 ))
}

ct_running() {
    local ctcount=$(docker ps -f 'status=running' -f "name=$DOCKER_NAME" | wc -l)
    (( ctcount >= 2 ))
}

logs() {
    msg blue "DOCKER LOGS: (press ctrl-c to exit) "
    docker logs -f --tail=30 "$DOCKER_NAME"
}

publishnow() {
    msg blue "DOCKER LOGS: (press ctrl-c to exit) "
    docker logs -f --tail=30 "$DOCKER_NAME"
}

build() {
    if img_exists; then
        msg bold yellow " -> Found existing image '${DOCKER_IMAGE}'..."
        msg yellow " -> Deleting old image '${DOCKER_IMAGE}'..."
        docker rmi "${DOCKER_IMAGE}"
    fi

    msg bold green " -> Building container '${DOCKER_IMAGE}'..."
    docker build -t hivefeed-js .
}

# Usage: ./run.sh install_docker
# Downloads and installs the latest version of Docker using the Get Docker site
# If Docker is already installed, it should update it.
install_docker() {
    sudo apt update
    # curl/git used by docker, xz/lz4 used by dlblocks, jq used by tslogs/pclogs
    sudo apt install -y curl git xz-utils liblz4-tool jq
    curl https://get.docker.com | sh
    if [ "$EUID" -ne 0 ]; then 
        msg cyan "Adding user $(whoami) to docker group"
        sudo usermod -aG docker $(whoami)
        msg cyan "IMPORTANT: Please re-login (or close and re-connect SSH) for docker to function correctly"
    fi
}

# Usage: ./run.sh install [tag]
#
install() {
    if (( $# == 1 )); then
        DK_TAG=$1
        # If neither '/' nor ':' are present in the tag, then for convenience, assume that the user wants
        # someguy123/hivefeed-js with this specific tag.
        if grep -qv ':' <<< "$1"; then
            if grep -qv '/' <<< "$1"; then
                msg bold red "WARNING: Neither / nor : were present in your tag '$1'"
                DK_TAG="someguy123/hivefeed-js:$1"
                msg red "We're assuming you've entered a version, and will try to install @someguy123's image: '${DK_TAG}'"
                msg yellow "If you *really* specifically want '$1' from Docker hub, set DK_TAG='$1' inside of .env and run './run.sh install'"
            fi
        fi
    fi
    msg bold red "NOTE: You are installing image $DK_TAG. Please make sure this is correct."
    sleep 2
    msg yellow " -> Loading image from ${DK_TAG}"
    docker pull "$DK_TAG"
    msg green " -> Tagging as ${DOCKER_IMAGE}"
    docker tag "$DK_TAG" "${DOCKER_IMAGE}"
    msg bold green " -> Installation completed. You may now configure or run the server"
}

_ct_stop() {
    if ct_running; then
        msg "If you don't care about a clean stop, you can force stop the container with ${BOLD}./run.sh kill"
        msgts red "Stopping container '${DOCKER_NAME}' (allowing up to ${STOP_TIME} seconds before killing)..."
        docker stop -t ${STOP_TIME} "$DOCKER_NAME"
    else
        msgts yellow "Container '$DOCKER_NAME' isn't running. Not stopping container."
    fi
}

_ct_remove() {
    if ct_exists; then
        msgts red "Removing old container '${DOCKER_NAME}'..."
        docker rm "$DOCKER_NAME"
        msgts green "Successfully stopped/removed ${DOCKER_NAME}"
    else
        msgts yellow "Container '$DOCKER_NAME' doesn't exist. Not removing container."
    fi
}

_ct_kill() {
    if ct_running; then
        msg bold red "Killing container '${DOCKER_NAME}'..."
        docker kill "$DOCKER_NAME"
    else
        msgts yellow "Container '$DOCKER_NAME' isn't running. Not killing container."
    fi
}

# Usage: ./run.sh stop
# Stops the hivefeed-js container, and removes the container to avoid any leftover
# configuration
stop() { _ct_stop; _ct_remove; }

sbkill() { _ct_kill && _ct_remove; }

# Usage: ./run.sh enter
# Enters the running docker container and opens a bash shell for debugging
#
enter() {
    if ct_running; then
        docker exec -it "$DOCKER_NAME" bash
    else
        msgts yellow "Container '$DOCKER_NAME' isn't running. Cannot enter container."
    fi
}

shell() {
    if ! img_exists; then
        msg yellow " -> Image '${DOCKER_IMAGE}' doesn't exist. Building image for '${DOCKER_IMAGE}' now..."
        build
    fi
    msg bold green "\n -> Starting shell '/bin/sh' in auto-removing container using image '${DOCKER_IMAGE}'...\n"
    docker run --rm -v "${SFJS_DIR}/config.json":/opt/hivefeed/config.json -it "$DOCKER_IMAGE" /bin/sh
    msg bold green "\n\n -> /bin/sh session terminated. Container should have been automatically cleaned up.\n"
}

start() {
    if ! img_exists; then
        msg yellow " -> Image '${DOCKER_IMAGE}' doesn't exist. Building image for '${DOCKER_IMAGE}' now..."
        build
    fi

    msg bold green " -> Starting container '${DOCKER_NAME}'..."
    if ct_exists; then
        if ct_running; then
            msg red "Container ${DOCKER_NAME} is still running! Aborting."
            msg red "If you want to restart hivefeed-js, use: ./run.sh restart"
            return 1
        fi
        msg yellow "Container ${DOCKER_NAME} exists. Deleting and re-creating container to be safe..."
        docker rm "$DOCKER_NAME"
    else
        msg green "Container ${DOCKER_NAME} doesn't exist yet, generating container..."
    fi

    docker run --name "${DOCKER_NAME}" -v "${SFJS_DIR}/config.json":/opt/hivefeed/config.json -dt "$DOCKER_IMAGE"

}

publish() {
    if ! img_exists; then
        msg yellow " -> Image '${DOCKER_IMAGE}' doesn't exist. Building image for '${DOCKER_IMAGE}' now..."
        build
    fi

    msg bold green " -> You've requested a one-time feed publish"
    msg bold green " -> Starting container 'feed-publishone' (container will be auto-deleted after publishing)"
    docker run --rm --name "feed-publishone" -v "${SFJS_DIR}/config.json":/opt/hivefeed/config.json -it "$DOCKER_IMAGE" ./app.js publishonce
    msg bold green " -> Finished running 'publishonce'"
}

status() {
    
    if ct_exists; then
        echo "Container exists?: "$GREEN"YES"$RESET
    else
        echo "Container exists?: "$RED"NO (!)"$RESET 
        echo "Container doesn't exist, thus it is NOT running. Run '$0 start'"$RESET
        return
    fi

    if ct_running; then
        echo "Container running?: "$GREEN"YES"$RESET
    else
        echo "Container running?: "$RED"NO (!)"$RESET
        echo "Container isn't running. Start it with '$0 start'"$RESET
        return
    fi

}

# For use by @someguy123 for generating binary images
# ./run.sh publish_img [version] (extratag def: latest)
# e.g. ./run.sh publish_img v3.0.0
# e.g. ./run.sh publish_img v3.1.0alpha testing
#
# disable extra tag:
# e.g. ./run.sh publish_img some-branch-fix n/a
#
publish_img() {
    if (( $# < 1 )); then
        msg green "Usage: $0 publish_img [version] (extratag def: latest)"
        msg yellow "Environment vars:\n\tMAIN_TAG - Override the primary tag (default: someguy123/hivefeed-js:\$V)\n"
        return 1
    fi

    V="$1"
    : ${MAIN_TAG="someguy123/hivefeed-js:$V"}
    SECTAG="latest"
    (( $# > 2 )) && SECTAG="$3"
    if [[ "$SECTAG" == "n/a" ]]; then
        msg bold yellow  " >> Will build tag $V as tags $MAIN_TAG (no second tag)"
    else
        SECOND_TAG="someguy123/hivefeed-js:$SECTAG"
        msg bold yellow " >> Will build tag $V as tags $MAIN_TAG and $SECOND_TAG"
    fi
    sleep 5
    docker build -t "$MAIN_TAG" .
    [[ "$SECTAG" != "n/a" ]] && docker tag "$MAIN_TAG" "$SECOND_TAG"
    docker push "$MAIN_TAG"
    [[ "$SECTAG" != "n/a" ]] && docker push "$SECOND_TAG"

    msg bold green " >> Finished"
}


help() {
    echo "Usage: $0 COMMAND [DATA]"
    echo
    echo "Commands: 
    start           - starts hivefeed-js container (automatically builds container if it doesn't exist)
    stop            - stops and removes hivefeed-js container
    kill            - force stop hivefeed-js container (in event of hivefeed-js hanging indefinitely)
    restart         - restarts hivefeed-js container
    status          - show status of hivefeed-js container

    publish         - publish a new feed immediately, then stop/remove the container (no automatic publishing at a regular interval)
                      aliases:  once, onetime, oneshot, publishonce, publish_once 

    install         - pulls latest docker image from server (no compiling)
    install_docker  - install docker
    rebuild         - removes any existing image, builds hivefeed-js image (from docker file), and then restarts it
    build           - only builds hivefeed-js image (from docker file)
    
    logs            - show all logs inc. docker logs, and hivefeed-js logs

    enter           - enter a bash session in the currently running container
    shell           - launch the hive container with appropriate mounts, then open bash for inspection
    "
    echo
    exit
}

if [ "$#" -lt 1 ]; then
    help
fi

case $1 in
    build)
        msg bold yellow "You may want to use '$0 install' for a binary image instead, it's faster."
        build "${@:2}"
        ;;
    install_docker)
        install_docker
        ;;
    install)
        install "${@:2}"
        ;;
    publish|publishonce|publish_once|once|onetime|oneshot)
        publish "${@:2}"
        ;;
    publish_img|publishimg|publish-img)
        publish_img "${@:2}"
        ;;
    start)
        start
        ;;
    stop)
        stop
        ;;
    kill)
        sbkill
        ;;
    restart)
        if ct_running; then
            stop
            sleep 5
        fi
        start
        ;;
    rebuild)
        if ct_running; then
            stop
            sleep 5
        fi
        build
        start
        ;;
    status)
        status
        ;;
    enter)
        enter
        ;;
    shell)
        shell
        ;;
    logs)
        logs
        ;;
    ver|version)
        ver
        ;;
    *)
        msg bold red "Invalid cmd"
        help
        ;;
esac

exit 0


