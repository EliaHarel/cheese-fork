'use strict';

/* global BootstrapDialog, firebase, currentSemester */

var CourseFeedback = (function () {
    function CourseFeedback(element, options) {
        this.element = element;
        this.columnGrid = options.columnGrid;
    }

    function newFeedbackDialog(courseFeedback, course) {
        var defaultText = 'שם המרצה:\n' +
            'חוות דעת - הרצאות:\n' +
            '\n' +
            'שם המתרגל/ת:\n' +
            'חוות דעת - תרגולים:\n' +
            '\n' +
            'שעורי הבית:\n' +
            '\n' +
            'המבחן:\n' +
            '\n' +
            'השורה התחתונה:';

        var formHtml = '<form>' +
                '<div class="form-row">' +
                    '<div class="form-group col-md-6">' +
                        '<label for="feedback-form-author">שם או כינוי</label>' +
                        '<input type="text" class="form-control" id="feedback-form-author" required>' +
                        '<div class="invalid-feedback">' +
                            'יש להכניס שם או כינוי' +
                        '</div>' +
                    '</div>' +
                    '<div class="form-group col-md-6">' +
                        '<label for="feedback-form-semester">סמסטר</label>' +
                        '<select class="form-control" id="feedback-form-semester" required>' +
                        '</select>' +
                        '<div class="invalid-feedback">' +
                            'יש לבחור סמסטר' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="form-row">' +
                    '<div class="form-group col-md-12">' +
                        '<label for="feedback-form-text">חוות דעת</label>' +
                        '<textarea class="form-control" id="feedback-form-text" rows="12" required>' +
                            defaultText +
                        '</textarea>' +
                    '</div>' +
                '</div>' +
                '<div class="form-row">' +
                    '<div class="form-group col-md-6">' +
                        '<label for="feedback-form-difficulty">עומס הקורס</label>' +
                        '<select class="form-control" id="feedback-form-difficulty" required>' +
                            '<option value="">לחצו לבחירה...</option>' +
                            '<option value="5">עמוס מאוד</option>' +
                            '<option value="4">עמוס</option>' +
                            '<option value="3">בינוני</option>' +
                            '<option value="2">טיפה עמוס</option>' +
                            '<option value="1">לא עמוס כלל</option>' +
                        '</select>' +
                        '<div class="invalid-feedback">' +
                            'יש לבחור אפשרות מתאימה' +
                        '</div>' +
                    '</div>' +
                    '<div class="form-group col-md-6">' +
                        '<label for="feedback-form-general">דירוג כללי</label>' +
                        '<select class="form-control" id="feedback-form-general" required>' +
                            '<option value="">לחצו לבחירה...</option>' +
                            '<option value="5">מומלץ מאוד</option>' +
                            '<option value="4">מומלץ</option>' +
                            '<option value="3">בינוני</option>' +
                            '<option value="2">פחות מומלץ</option>' +
                            '<option value="1">לא מומלץ כלל</option>' +
                        '</select>' +
                        '<div class="invalid-feedback">' +
                            'יש לבחור אפשרות מתאימה' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</form>';

        BootstrapDialog.show({
            title: 'פרסום חוות דעת',
            message: $(formHtml),
            buttons: [{
                label: 'פרסם',
                cssClass: 'btn-primary',
                action: function (dialog) {
                    var body = dialog.getModalBody();

                    var form = body.find('form').get(0);
                    if (form.checkValidity() === false) {
                        form.classList.add('was-validated');
                        return;
                    }
                    form.classList.remove('was-validated');

                    var data = {
                        timestamp: Date.now(),
                        author: body.find('#feedback-form-author').val().trim(),
                        semester: body.find('#feedback-form-semester').val(),
                        text: body.find('#feedback-form-text').val().trim(),
                        difficultyRank: parseInt(body.find('#feedback-form-difficulty').val(), 10),
                        generalRank: parseInt(body.find('#feedback-form-general').val(), 10)
                    };

                    var update = {
                        posts: firebase.firestore.FieldValue.arrayUnion(data)
                    };

                    firebase.firestore().collection('courseFeedback').doc(course)
                        .set(update, {merge: true})
                        .then(function () {
                            courseFeedback.loadFeedback(course, false);
                        })
                        .catch(function (error) {
                            alert('Error writing document: ' + error);
                        });

                    dialog.close();
                }
            }, {
                label: 'סגור',
                action: function (dialog) {
                    dialog.close();
                }
            }],
            onshow: function (dialog) {
                var body = dialog.getModalBody();

                var selectSemester = body.find('#feedback-form-semester');
                // Show next year's semesters when we're past October.
                var nineMonthsAgo = new Date();
                nineMonthsAgo.setMonth(nineMonthsAgo.getMonth() - 9);
                for (var year = 2000; year <= nineMonthsAgo.getFullYear(); year++) {
                    for (var season = 1; season <= 3; season++) {
                        var semester = year.toString() + '0' + season.toString();
                        selectSemester.prepend($('<option>', {
                            value: semester,
                            text: semesterFriendlyName(semester)
                        }));
                    }
                }
                selectSemester.prepend($('<option value="">לחצו לבחירת סמסטר...</option>')).val(typeof currentSemester !== 'undefined' ? currentSemester : '');

                try {
                    var displayName = firebase.auth().currentUser.displayName;
                    if (displayName) {
                        body.find('#feedback-form-author').val(displayName);
                    }
                } catch (e) {
                    // Can fail if no auth module is loaded, or if not authenticated.
                }
            }
        });
    }

    function makeRanksHtml(generalRank, difficultyRank, columnGrid) {
        var makeStars = function (rank) {
            var html = '';
            var rantTimesTwo = Math.round(rank * 2);
            for (var i = 0; i < 5; i++) {
                if (i * 2 >= rantTimesTwo) {
                    // Empty star.
                    html += '<i class="far fa-star"></i>';
                } else if (i * 2 + 1 >= rantTimesTwo) {
                    // Half star.
                    html += '<i class="fas fa-star-half-alt"></i>';
                } else {
                    // Full star.
                    html += '<i class="fas fa-star"></i>';
                }
            }

            return html;
        };

        return '<div class="row course-ranks">' +
                '<div class="col-' + columnGrid + ' course-rank">' +
                    '<div class="course-rank-title">כללי</div>' +
                    '<div class="course-rank-icons">' +
                        '<i class="fas fa-2x fa-thumbs-down"></i>' +
                        makeStars(generalRank) +
                        '<i class="fas fa-2x fa-thumbs-up"></i>' +
                    '</div>' +
                '</div>' +
                '<div class="col-' + columnGrid + ' course-rank">' +
                    '<div class="course-rank-title">עומס</div>' +
                    '<div class="course-rank-icons">' +
                        '<i class="fas fa-2x fa-feather-alt"></i>' +
                        makeStars(difficultyRank) +
                        '<i class="fas fa-2x fa-dumbbell"></i>' +
                    '</div>' +
                '</div>' +
            '</div>';
    }

    function makeFeedbackSummaryHtml(posts, columnGrid) {
        var content = $('<div id="course-feedback-summary"></div>');

        var title = 'חוות דעת';
        if (posts.length === 1) {
            title = 'חוות דעת אחת';
        } else if (posts.length > 1) {
            title = posts.length + ' חוות דעת';
        }

        content.append($('<h3>', {
            text: title
        }));

        if (posts.length > 0) {
            var generalRank = 0;
            var difficultyRank = 0;
            var rankCount = 0;

            posts.forEach(function (post) {
                if (post.generalRank && post.difficultyRank) {
                    generalRank += post.generalRank;
                    difficultyRank += post.difficultyRank;
                    rankCount++;
                }
            });

            if (rankCount > 0) {
                generalRank /= rankCount;
                difficultyRank /= rankCount;

                content.append(makeRanksHtml(generalRank, difficultyRank, columnGrid));
            }
        }

        return content;
    }

    function makeFeedbackSinglePostHtml(post, columnGrid) {
        var content = $('<div class="timeline-box"></div>');

        content.append($('<div>', {
            class: 'box-title',
            text: semesterFriendlyName(post.semester)
        }));

        var postContent = $('<div>', {
            class: 'box-content',
            html: $('<div>').text(post.text).html().replace(/\n/g, '<br>')
        });

        if (post.generalRank && post.difficultyRank) {
            postContent.append(makeRanksHtml(post.generalRank, post.difficultyRank, columnGrid));
        }

        content.append(postContent);

        var prettyDate = new Date(post.timestamp).toLocaleDateString('he-IL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        content.append($('<div>', {
            class: 'box-footer',
            text: '- ' + post.author + ', ' + prettyDate
        }));

        return content;
    }

    function makeFeedbackPostsHtml(posts, columnGrid) {
        var content = $('<div id="course-feedback-carousel" class="carousel slide carousel-fade" data-ride="carousel" data-interval="false">' +
                '<ol class="carousel-indicators"></ol>' +
                '<div class="carousel-inner"></div>' +
                '<a class="carousel-control-prev" href="#course-feedback-carousel" role="button" data-slide="prev">' +
                    '<span class="carousel-control-prev-icon" aria-hidden="true"></span>' +
                    '<span class="sr-only">Previous</span>' +
                '</a>' +
                '<a class="carousel-control-next" href="#course-feedback-carousel" role="button" data-slide="next">' +
                    '<span class="carousel-control-next-icon" aria-hidden="true"></span>' +
                    '<span class="sr-only">Next</span>' +
                '</a>' +
            '</div>');

        var carouselIndicators = content.find('.carousel-indicators');
        var carouselInner = content.find('.carousel-inner');

        posts.forEach(function (post, i) {
            var active = i === posts.length - 1;

            var indicator = '<li data-target="#course-feedback-carousel" data-slide-to="' + i + '"' + (active ? ' class="active"' : '') + '></li>';
            carouselIndicators.append(indicator);

            var carouselItemContents = $('<div class="carousel-item-contents"></div>')
                .append(makeFeedbackSinglePostHtml(post, columnGrid));

            var carouselItem = $('<div class="carousel-item' + (active ? ' active' : '') + '"></div>')
                .append(carouselItemContents);

            carouselInner.append(carouselItem);
        });

        return content;
    }

    function renderFeedback(courseFeedback, course, posts) {
        var element = courseFeedback.element;

        var columnGrid = courseFeedback.columnGrid || 'lg';

        var content = $('<div id="course-feedback"></div>')
            .append(makeFeedbackSummaryHtml(posts, columnGrid));

        if (posts.length > 0) {
            content.append(makeFeedbackPostsHtml(posts, columnGrid));
        } else {
            content.append($('<div>', {
                class: 'mb-2',
                text: 'לא קיימות חוות דעת לקורס זה.'
            }));
        }

        var newFeedbackButton = $('<button type="button" class="btn btn-primary">פרסום חוות דעת</button>')
            .click(function (event) {
                newFeedbackDialog(courseFeedback, course);
            });

        content.append($('<div class="text-center"></div>').append(newFeedbackButton));

        element.html(content);
    }

    function semesterFriendlyName(semester) {
        var year = parseInt(semester.slice(0, 4), 10);
        var semesterCode = semester.slice(4);

        switch (semesterCode) {
        case '01':
            return 'חורף ' + year + '-' + (year + 1);

        case '02':
            return 'אביב ' + (year + 1);

        case '03':
            return 'קיץ ' + (year + 1);

        default:
            return semester;
        }
    }

    CourseFeedback.prototype.loadFeedback = function (course, loadingMessage = true) {
        var element = this.element;
        var that = this;

        if (loadingMessage) {
            element.text('טוען נתונים...');
        }

        var onError = function () {
            element.text('טעינת הנתונים נכשלה. נסו שוב מאוחר יותר.');
        };

        if (typeof firebase !== 'undefined') {
            firebase.firestore().collection('courseFeedback').doc(course).get()
                .then(function (doc) {
                    var posts = [];
                    if (doc.exists) {
                        var data = doc.data();
                        posts = data.posts;
                    }

                    renderFeedback(that, course, posts);
                })
                .catch(function (error) {
                    onError();
                });
        } else {
            onError();
        }
    };

    return CourseFeedback;
})();
