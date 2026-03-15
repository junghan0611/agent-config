;;; context-test.el --- Tests for pi-emacs-context -*- lexical-binding: t; -*-

(require 'cl-lib)
(require 'ert)

(defconst pi-emacs--test-root
  (file-name-directory (or load-file-name buffer-file-name)))

(load-file (expand-file-name "../scripts/context.el" pi-emacs--test-root))

(ert-deftest pi-emacs-candidate-buffers-filters-dead-buffers ()
  (let* ((active (generate-new-buffer "pi-emacs-active"))
         (dead (generate-new-buffer "pi-emacs-dead"))
         (persp (list :dummy t)))
    (unwind-protect
        (progn
          (kill-buffer dead)
          (cl-letf (((symbol-function 'pi-emacs--maybe-persp)
                     (lambda () persp))
                    ((symbol-function 'pi-emacs--persp-buffers)
                     (lambda (_persp) (list nil dead active))))
            (let ((buffers (pi-emacs--candidate-buffers)))
              (should (equal buffers (list active))))))
      (when (buffer-live-p active)
        (kill-buffer active)))))

(provide 'context-test)
