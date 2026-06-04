from info_monitor_worker.worker import Worker


def main() -> None:
    worker = Worker()
    worker.run_once()


if __name__ == "__main__":
    main()
