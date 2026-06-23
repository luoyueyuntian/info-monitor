from info_monitor_worker.worker import Worker


def main() -> None:
    worker = Worker()
    worker.run_forever()


if __name__ == "__main__":
    main()
